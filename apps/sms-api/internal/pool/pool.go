// Package pool provides a goroutine pool with object pooling, error handling,
// and comprehensive concurrency management for Go applications.
package pool

import (
	"context"
	"errors"
	"fmt"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

var (
	// ErrPoolClosed indicates the pool has been closed
	ErrPoolClosed = errors.New("pool is closed")
	// ErrTaskTimeout indicates a task exceeded its timeout
	ErrTaskTimeout = errors.New("task execution timeout")
	// ErrPoolFull indicates the pool queue is full
	ErrPoolFull = errors.New("pool queue is full")
)

// Task represents a unit of work to be executed
type Task interface {
	Execute(ctx context.Context) error
}

// TaskFunc is a function adapter for Task interface
type TaskFunc func(ctx context.Context) error

func (f TaskFunc) Execute(ctx context.Context) error {
	return f(ctx)
}

// TaskResult holds the result of a task execution
type TaskResult struct {
	ID        string
	Error     error
	Duration  time.Duration
	StartTime time.Time
}

// PoolConfig holds configuration options for the pool
type PoolConfig struct {
	// MaxWorkers is the maximum number of goroutines
	MaxWorkers int
	// QueueSize is the size of the task queue
	QueueSize int
	// WorkerIdleTimeout is how long a worker waits before shutting down
	WorkerIdleTimeout time.Duration
	// TaskTimeout is the default timeout for task execution
	TaskTimeout time.Duration
	// EnableMetrics enables collection of execution metrics
	EnableMetrics bool
	// PanicHandler handles panics in worker goroutines
	PanicHandler func(interface{})
}

// DefaultConfig returns a sensible default configuration
func DefaultConfig() *PoolConfig {
	return &PoolConfig{
		MaxWorkers:        runtime.NumCPU(),
		QueueSize:         100,
		WorkerIdleTimeout: 30 * time.Second,
		TaskTimeout:       5 * time.Minute,
		EnableMetrics:     true,
		PanicHandler: func(p interface{}) {
			fmt.Printf("Worker panic recovered: %v\n", p)
		},
	}
}

// PoolMetrics holds pool execution metrics
type PoolMetrics struct {
	TasksSubmitted       int64
	TasksCompleted       int64
	TasksFailed          int64
	ActiveWorkers        int64
	QueuedTasks          int64
	TotalExecutionTime   time.Duration
	AverageExecutionTime time.Duration
}

// Pool represents a goroutine pool with object pooling and error handling
type Pool struct {
	config *PoolConfig
	tasks  chan taskWrapper
	wg     sync.WaitGroup
	ctx    context.Context
	cancel context.CancelFunc
	closed int64

	// Metrics
	metrics     *PoolMetrics
	metricsLock sync.RWMutex

	// Object pools for result objects only
	resultPool sync.Pool
}

// taskWrapper wraps a task with metadata and result handling
type taskWrapper struct {
	id      string
	task    Task
	ctx     context.Context
	cancel  context.CancelFunc
	result  chan TaskResult
	timeout time.Duration
}

// NewPool creates a new goroutine pool with the given configuration
func New(config *PoolConfig) *Pool {
	if config == nil {
		config = DefaultConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())

	p := &Pool{
		config:  config,
		tasks:   make(chan taskWrapper, config.QueueSize),
		ctx:     ctx,
		cancel:  cancel,
		metrics: &PoolMetrics{},
	}

	// Initialize result object pool only
	p.resultPool.New = func() interface{} {
		return &TaskResult{}
	}

	return p
}

// Start initializes the pool workers
func (p *Pool) Start() {
	for i := 0; i < p.config.MaxWorkers; i++ {
		p.wg.Add(1)
		go p.worker(fmt.Sprintf("worker-%d", i))
	}
}

// worker is the main worker goroutine
func (p *Pool) worker(name string) {
	defer p.wg.Done()

	if p.config.EnableMetrics {
		atomic.AddInt64(&p.metrics.ActiveWorkers, 1)
		defer atomic.AddInt64(&p.metrics.ActiveWorkers, -1)
	}

	idleTimer := time.NewTimer(p.config.WorkerIdleTimeout)
	defer idleTimer.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case wrapper, ok := <-p.tasks:
			if !ok {
				// Channel closed, shutdown
				return
			}
			p.executeTask(wrapper)

			// Reset idle timer
			if !idleTimer.Stop() {
				select {
				case <-idleTimer.C:
				default:
				}
			}
			idleTimer.Reset(p.config.WorkerIdleTimeout)

		case <-idleTimer.C:
			// Worker idle timeout - check if we should shutdown this worker
			// Only shutdown if there are other workers available
			currentWorkers := atomic.LoadInt64(&p.metrics.ActiveWorkers)
			if currentWorkers > 1 {
				return
			}
			// Reset timer and continue if we're the last worker
			idleTimer.Reset(p.config.WorkerIdleTimeout)
		}
	}
}

// executeTask executes a single task with panic recovery
func (p *Pool) executeTask(wrapper taskWrapper) {
	// Validate wrapper has required fields before proceeding
	if wrapper.task == nil || wrapper.ctx == nil || wrapper.result == nil {
		// Invalid wrapper, likely due to object pool corruption
		if p.config.EnableMetrics {
			atomic.AddInt64(&p.metrics.QueuedTasks, -1)
		}
		return
	}

	// Create local copies to avoid race conditions
	taskID := wrapper.id
	task := wrapper.task
	taskCtx := wrapper.ctx
	resultChan := wrapper.result
	cancelFunc := wrapper.cancel

	defer func() {
		// Clean up context
		if cancelFunc != nil {
			cancelFunc()
		}

		// Update metrics
		if p.config.EnableMetrics {
			atomic.AddInt64(&p.metrics.QueuedTasks, -1)
		}
	}()

	startTime := time.Now()
	result := p.getResult()
	result.ID = taskID
	result.StartTime = startTime

	// Execute task with proper error and panic handling
	func() {
		defer func() {
			if r := recover(); r != nil {
				if p.config.PanicHandler != nil {
					p.config.PanicHandler(r)
				}
				result.Error = fmt.Errorf("task panicked: %v", r)
			}
		}()

		// Check if context is already cancelled before starting
		select {
		case <-taskCtx.Done():
			result.Error = taskCtx.Err()
			return
		default:
		}

		// Execute the task
		result.Error = task.Execute(taskCtx)
	}()

	// Convert context deadline exceeded to our custom timeout error
	if result.Error != nil && errors.Is(result.Error, context.DeadlineExceeded) {
		result.Error = ErrTaskTimeout
	}

	result.Duration = time.Since(startTime)

	// Update metrics
	if p.config.EnableMetrics {
		if result.Error != nil {
			atomic.AddInt64(&p.metrics.TasksFailed, 1)
		} else {
			atomic.AddInt64(&p.metrics.TasksCompleted, 1)
		}
		p.updateExecutionMetrics(result.Duration)
	}

	// Send result - use non-blocking send with timeout
	select {
	case resultChan <- *result:
		// Result sent successfully
	case <-time.After(100 * time.Millisecond):
		// Result channel blocked, drop result
	}

	p.putResult(result)
}

// Submit submits a task to the pool and returns a result channel
func (p *Pool) Submit(task Task) (<-chan TaskResult, error) {
	return p.SubmitWithTimeout(task, p.config.TaskTimeout)
}

// SubmitWithTimeout submits a task with a custom timeout
func (p *Pool) SubmitWithTimeout(task Task, timeout time.Duration) (<-chan TaskResult, error) {
	if atomic.LoadInt64(&p.closed) == 1 {
		return nil, ErrPoolClosed
	}

	if task == nil {
		return nil, errors.New("task cannot be nil")
	}

	// Create a fresh task wrapper instead of using object pool for the channel operation
	// The object pool was causing race conditions with the channel sends
	taskCtx, cancel := context.WithTimeout(p.ctx, timeout)
	if taskCtx == nil || cancel == nil {
		return nil, errors.New("failed to create task context")
	}

	wrapper := taskWrapper{
		id:      fmt.Sprintf("task-%d", time.Now().UnixNano()),
		task:    task,
		ctx:     taskCtx,
		cancel:  cancel,
		result:  make(chan TaskResult, 1),
		timeout: timeout,
	}

	if p.config.EnableMetrics {
		atomic.AddInt64(&p.metrics.TasksSubmitted, 1)
		atomic.AddInt64(&p.metrics.QueuedTasks, 1)
	}

	select {
	case p.tasks <- wrapper:
		return wrapper.result, nil
	case <-p.ctx.Done():
		cancel()
		if p.config.EnableMetrics {
			atomic.AddInt64(&p.metrics.TasksSubmitted, -1)
			atomic.AddInt64(&p.metrics.QueuedTasks, -1)
		}
		return nil, ErrPoolClosed
	default:
		cancel()
		if p.config.EnableMetrics {
			atomic.AddInt64(&p.metrics.TasksSubmitted, -1)
			atomic.AddInt64(&p.metrics.QueuedTasks, -1)
		}
		return nil, ErrPoolFull
	}
}

// SubmitFunc is a convenience method for submitting function tasks
func (p *Pool) SubmitFunc(fn func(ctx context.Context) error) (<-chan TaskResult, error) {
	return p.Submit(TaskFunc(fn))
}

// SubmitAndWait submits a task and waits for its completion
func (p *Pool) SubmitAndWait(task Task) TaskResult {
	resultCh, err := p.Submit(task)
	if err != nil {
		return TaskResult{
			Error: err,
		}
	}

	select {
	case result := <-resultCh:
		return result
	case <-p.ctx.Done():
		return TaskResult{
			Error: ErrPoolClosed,
		}
	}
}

// GetMetrics returns current pool metrics
func (p *Pool) GetMetrics() PoolMetrics {
	p.metricsLock.RLock()
	defer p.metricsLock.RUnlock()

	return PoolMetrics{
		TasksSubmitted:       atomic.LoadInt64(&p.metrics.TasksSubmitted),
		TasksCompleted:       atomic.LoadInt64(&p.metrics.TasksCompleted),
		TasksFailed:          atomic.LoadInt64(&p.metrics.TasksFailed),
		ActiveWorkers:        atomic.LoadInt64(&p.metrics.ActiveWorkers),
		QueuedTasks:          atomic.LoadInt64(&p.metrics.QueuedTasks),
		TotalExecutionTime:   p.metrics.TotalExecutionTime,
		AverageExecutionTime: p.metrics.AverageExecutionTime,
	}
}

// Close gracefully shuts down the pool
func (p *Pool) Close() error {
	if !atomic.CompareAndSwapInt64(&p.closed, 0, 1) {
		return ErrPoolClosed
	}

	p.cancel()
	close(p.tasks)
	p.wg.Wait()

	return nil
}

// CloseWithTimeout closes the pool with a timeout
func (p *Pool) CloseWithTimeout(timeout time.Duration) error {
	done := make(chan error, 1)
	go func() {
		done <- p.Close()
	}()

	select {
	case err := <-done:
		return err
	case <-time.After(timeout):
		return fmt.Errorf("pool close timeout exceeded")
	}
}

// Object pool methods for results only
func (p *Pool) getResult() *TaskResult {
	return p.resultPool.Get().(*TaskResult)
}

func (p *Pool) putResult(result *TaskResult) {
	result.ID = ""
	result.Error = nil
	result.Duration = 0
	result.StartTime = time.Time{}
	p.resultPool.Put(result)
}

// updateExecutionMetrics updates the execution time metrics
func (p *Pool) updateExecutionMetrics(duration time.Duration) {
	p.metricsLock.Lock()
	defer p.metricsLock.Unlock()

	p.metrics.TotalExecutionTime += duration

	completed := atomic.LoadInt64(&p.metrics.TasksCompleted)
	if completed > 0 {
		p.metrics.AverageExecutionTime = p.metrics.TotalExecutionTime / time.Duration(completed)
	}
}

// Batch operations
type BatchResult struct {
	Results []TaskResult
	Errors  []error
}

// SubmitBatch submits multiple tasks and waits for all to complete
func (p *Pool) SubmitBatch(tasks []Task) BatchResult {
	results := make([]TaskResult, len(tasks))
	errors := make([]error, len(tasks))

	var wg sync.WaitGroup
	for i, task := range tasks {
		wg.Add(1)
		go func(idx int, t Task) {
			defer wg.Done()

			resultCh, err := p.Submit(t)
			if err != nil {
				errors[idx] = err
				return
			}

			select {
			case result := <-resultCh:
				results[idx] = result
			case <-p.ctx.Done():
				errors[idx] = ErrPoolClosed
			}
		}(i, task)
	}

	wg.Wait()
	return BatchResult{
		Results: results,
		Errors:  errors,
	}
}

func (p *Pool) Config() *PoolConfig {
	return p.config
}
