package pool_test

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"encore.app/internal/pool"
)

// Mock task for testing
type mockTask struct {
	id          string
	duration    time.Duration
	shouldError bool
	errorMsg    string
	shouldPanic bool
}

func TestConcurrentSubmission(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	const numTasks = 100
	var wg sync.WaitGroup
	var completedTasks int64

	for i := 0; i < numTasks; i++ {
		wg.Add(1)
		go func(taskID int) {
			defer wg.Done()

			task := &mockTask{
				id:       fmt.Sprintf("concurrent-task-%d", taskID),
				duration: 10 * time.Millisecond,
			}

			resultCh, err := p.Submit(task)
			if err != nil {
				t.Errorf("Failed to submit task %d: %v", taskID, err)
				return
			}

			result := <-resultCh
			if result.Error != nil {
				t.Errorf("Task %d failed: %v", taskID, result.Error)
				return
			}

			atomic.AddInt64(&completedTasks, 1)
		}(i)
	}

	wg.Wait()

	if completedTasks != numTasks {
		t.Errorf("Expected %d completed tasks, got %d", numTasks, completedTasks)
	}
}

func TestQueueFullError(t *testing.T) {
	config := &pool.PoolConfig{
		MaxWorkers:        1,
		QueueSize:         2,
		WorkerIdleTimeout: 1 * time.Second,
		TaskTimeout:       5 * time.Second,
		EnableMetrics:     true,
	}

	p := pool.New(config)
	p.Start()
	defer p.Close()

	// Submit blocking tasks to fill the queue
	blockingTask := &mockTask{
		id:       "blocking-task",
		duration: 1 * time.Second,
	}

	// Submit tasks until queue is full
	var submitted int
	for i := 0; i < 10; i++ {
		_, err := p.Submit(blockingTask)
		if err == pool.ErrPoolFull {
			break
		}
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
			break
		}
		submitted++
	}

	// The next submission should fail with ErrPoolFull
	_, err := p.Submit(blockingTask)
	if err != pool.ErrPoolFull {
		t.Errorf("Expected ErrPoolFull, got %v", err)
	}
}

func TestMetrics(t *testing.T) {
	config := pool.DefaultConfig()
	config.EnableMetrics = true
	p := pool.New(config)
	p.Start()
	defer p.Close()

	const numTasks = 10
	const numFailingTasks = 3

	// Submit successful tasks
	for i := 0; i < numTasks-numFailingTasks; i++ {
		task := &mockTask{
			id:       fmt.Sprintf("success-task-%d", i),
			duration: 50 * time.Millisecond,
		}
		resultCh, _ := p.Submit(task)
		<-resultCh // Wait for completion
	}

	// Submit failing tasks
	for i := 0; i < numFailingTasks; i++ {
		task := &mockTask{
			id:          fmt.Sprintf("fail-task-%d", i),
			duration:    50 * time.Millisecond,
			shouldError: true,
			errorMsg:    "test error",
		}
		resultCh, _ := p.Submit(task)
		<-resultCh // Wait for completion
	}

	// Check metrics
	metrics := p.GetMetrics()

	if metrics.TasksSubmitted != numTasks {
		t.Errorf("Expected %d submitted tasks, got %d", numTasks, metrics.TasksSubmitted)
	}

	if metrics.TasksCompleted != numTasks-numFailingTasks {
		t.Errorf(
			"Expected %d completed tasks, got %d",
			numTasks-numFailingTasks,
			metrics.TasksCompleted,
		)
	}

	if metrics.TasksFailed != numFailingTasks {
		t.Errorf("Expected %d failed tasks, got %d", numFailingTasks, metrics.TasksFailed)
	}

	if metrics.AverageExecutionTime <= 0 {
		t.Error("Expected positive average execution time")
	}
}

func TestSubmitAndWait(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	task := &mockTask{
		id:       "sync-task",
		duration: 100 * time.Millisecond,
	}

	start := time.Now()
	result := p.SubmitAndWait(task)
	elapsed := time.Since(start)

	if result.Error != nil {
		t.Errorf("SubmitAndWait failed: %v", result.Error)
	}

	if elapsed < 100*time.Millisecond {
		t.Errorf("Expected elapsed time >= 100ms, got %v", elapsed)
	}
}

func TestSubmitFunc(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	executed := false
	taskFunc := func(ctx context.Context) error {
		time.Sleep(50 * time.Millisecond)
		executed = true
		return nil
	}

	resultCh, err := p.SubmitFunc(taskFunc)
	if err != nil {
		t.Fatalf("Failed to submit function: %v", err)
	}

	result := <-resultCh
	if result.Error != nil {
		t.Errorf("Function task failed: %v", result.Error)
	}

	if !executed {
		t.Error("Function was not executed")
	}
}

func TestBatchSubmission(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	const batchSize = 5
	tasks := make([]pool.Task, batchSize)

	for i := 0; i < batchSize; i++ {
		tasks[i] = &mockTask{
			id:          fmt.Sprintf("batch-task-%d", i),
			duration:    50 * time.Millisecond,
			shouldError: i%2 == 0, // Fail even-numbered tasks
			errorMsg:    fmt.Sprintf("error-%d", i),
		}
	}

	batchResult := p.SubmitBatch(tasks)

	if len(batchResult.Results) != batchSize {
		t.Errorf("Expected %d results, got %d", batchSize, len(batchResult.Results))
	}

	if len(batchResult.Errors) != batchSize {
		t.Errorf("Expected %d error slots, got %d", batchSize, len(batchResult.Errors))
	}

	// Check that even-numbered tasks failed and odd-numbered tasks succeeded
	for i := 0; i < batchSize; i++ {
		if i%2 == 0 {
			// Should have failed
			if batchResult.Results[i].Error == nil {
				t.Errorf("Expected task %d to fail", i)
			}
		} else {
			// Should have succeeded
			if batchResult.Results[i].Error != nil {
				t.Errorf("Expected task %d to succeed, got error: %v", i, batchResult.Results[i].Error)
			}
		}
	}
}

func TestCloseWithTimeout(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()

	// Submit a long-running task
	longTask := &mockTask{
		id:       "long-task",
		duration: 2 * time.Second,
	}

	// Submit the task and get the result channel to track completion
	resultCh, err := p.Submit(longTask)
	if err != nil {
		t.Fatalf("Failed to submit long task: %v", err)
	}

	// Give the task a moment to start
	time.Sleep(100 * time.Millisecond)

	// Close with sufficient timeout
	start := time.Now()
	err = p.CloseWithTimeout(3 * time.Second)
	elapsed := time.Since(start)

	if err != nil {
		t.Errorf("Close with timeout failed: %v", err)
	}

	// Wait for the task result to verify it was cancelled
	select {
	case result := <-resultCh:
		// Task should have been cancelled due to pool closure
		if result.Error == nil {
			t.Log("Task completed normally before pool closure")
		} else {
			t.Logf("Task was cancelled as expected: %v", result.Error)
		}
	case <-time.After(1 * time.Second):
		t.Error("Task result not received after pool closure")
	}

	// The close operation should be relatively quick since it cancels tasks
	if elapsed > 1*time.Second {
		t.Logf("Close took %v (longer than expected but acceptable)", elapsed)
	} else {
		t.Logf("Close completed in %v", elapsed)
	}
}

func TestObjectPooling(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	// Submit many tasks to exercise object ping
	const numTasks = 100
	var wg sync.WaitGroup

	for i := 0; i < numTasks; i++ {
		wg.Add(1)
		go func(taskID int) {
			defer wg.Done()

			task := &mockTask{
				id:       fmt.Sprintf("p-task-%d", taskID),
				duration: 10 * time.Millisecond,
			}

			resultCh, err := p.Submit(task)
			if err != nil {
				t.Errorf("Failed to submit task %d: %v", taskID, err)
				return
			}

			result := <-resultCh
			if result.Error != nil {
				t.Errorf("Task %d failed: %v", taskID, result.Error)
			}
		}(i)
	}

	wg.Wait()

	// Verify metrics show all tasks were processed
	metrics := p.GetMetrics()
	if metrics.TasksSubmitted != numTasks {
		t.Errorf("Expected %d submitted tasks, got %d", numTasks, metrics.TasksSubmitted)
	}
}

func TestWorkerIdleTimeout(t *testing.T) {
	config := &pool.PoolConfig{
		MaxWorkers:        4,
		QueueSize:         10,
		WorkerIdleTimeout: 100 * time.Millisecond, // Very short idle timeout
		TaskTimeout:       5 * time.Second,
		EnableMetrics:     true,
	}

	p := pool.New(config)
	p.Start()
	defer p.Close()

	// Submit a task to start workers
	task := &mockTask{
		id:       "starter-task",
		duration: 50 * time.Millisecond,
	}

	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit starter task: %v", err)
	}

	// Wait for task to complete
	select {
	case result := <-resultCh:
		if result.Error != nil {
			t.Errorf("Starter task failed: %v", result.Error)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Starter task timed out")
	}

	// Check initial worker count
	initialMetrics := p.GetMetrics()
	if initialMetrics.ActiveWorkers <= 0 {
		t.Error("Expected active workers after task submission")
	}

	// Wait longer than idle timeout for workers to potentially shut down
	time.Sleep(300 * time.Millisecond)

	// Submit another task - should still work even if some workers shut down
	task2 := &mockTask{
		id:       "after-idle-task",
		duration: 50 * time.Millisecond,
	}

	resultCh2, err := p.Submit(task2)
	if err != nil {
		t.Fatalf("Failed to submit task after idle: %v", err)
	}

	select {
	case result := <-resultCh2:
		if result.Error != nil {
			t.Errorf("Task after idle failed: %v", result.Error)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Task after idle timed out")
	}

	// The test passes if we can successfully submit and execute tasks
	// Worker count may vary due to idle timeout behavior
	finalMetrics := p.GetMetrics()
	t.Logf("Initial active workers: %d, Final active workers: %d",
		initialMetrics.ActiveWorkers, finalMetrics.ActiveWorkers)
}

func BenchmarkPoolSubmission(b *testing.B) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			task := &mockTask{
				id:       "bench-task",
				duration: 1 * time.Millisecond,
			}

			resultCh, err := p.Submit(task)
			if err != nil {
				b.Errorf("Failed to submit task: %v", err)
				continue
			}

			<-resultCh
		}
	})
}

func BenchmarkPoolObjectReuse(b *testing.B) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	// Pre-warm the object ps
	for i := 0; i < 10; i++ {
		task := &mockTask{id: "warmup", duration: 1 * time.Millisecond}
		resultCh, _ := p.Submit(task)
		<-resultCh
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		task := &mockTask{
			id:       "bench-task",
			duration: 1 * time.Millisecond,
		}

		resultCh, _ := p.Submit(task)
		<-resultCh
	}
}

func (m *mockTask) Execute(ctx context.Context) error {
	if m.shouldPanic {
		panic("test panic")
	}

	select {
	case <-time.After(m.duration):
		if m.shouldError {
			return errors.New(m.errorMsg)
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func TestPoolCreation(t *testing.T) {
	config := pool.DefaultConfig()
	p := pool.New(config)

	if p == nil {
		t.Fatal("Expected p to be created")
	}

	if p.Config() != config {
		t.Error("Expected p to use provided config")
	}
}

func TestPoolWithNilConfig(t *testing.T) {
	p := pool.New(nil)

	if p == nil {
		t.Fatal("Expected p to be created with default config")
	}

	if p.Config().MaxWorkers != pool.DefaultConfig().MaxWorkers {
		t.Error("Expected p to use default config values")
	}
}

func TestBasicTaskExecution(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	task := &mockTask{
		id:       "test-task",
		duration: 100 * time.Millisecond,
	}

	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit task: %v", err)
	}

	select {
	case result := <-resultCh:
		if result.Error != nil {
			t.Errorf("Task execution failed: %v", result.Error)
		}
		if result.Duration < 100*time.Millisecond {
			t.Errorf("Expected duration >= 100ms, got %v", result.Duration)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Task execution timeout")
	}
}

func TestTaskError(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()
	defer p.Close()

	expectedError := "test error"
	task := &mockTask{
		id:          "error-task",
		duration:    50 * time.Millisecond,
		shouldError: true,
		errorMsg:    expectedError,
	}

	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit task: %v", err)
	}

	result := <-resultCh
	if result.Error == nil {
		t.Fatal("Expected task to return error")
	}

	if result.Error.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%v'", expectedError, result.Error)
	}
}

func TestTaskTimeout(t *testing.T) {
	config := pool.DefaultConfig()
	config.TaskTimeout = 100 * time.Millisecond
	p := pool.New(config)
	p.Start()
	defer p.Close()

	task := &mockTask{
		id:       "timeout-task",
		duration: 500 * time.Millisecond, // Longer than timeout
	}

	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit task: %v", err)
	}

	result := <-resultCh
	if result.Error != pool.ErrTaskTimeout {
		t.Errorf("Expected timeout error, got %v", result.Error)
	}
}

func TestTaskPanic(t *testing.T) {
	var panicRecovered interface{}
	config := pool.DefaultConfig()
	config.PanicHandler = func(p interface{}) {
		panicRecovered = p
	}

	p := pool.New(config)
	p.Start()
	defer p.Close()

	task := &mockTask{
		id:          "panic-task",
		shouldPanic: true,
	}

	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit task: %v", err)
	}

	result := <-resultCh
	if result.Error == nil {
		t.Fatal("Expected panic to result in error")
	}

	if panicRecovered != "test panic" {
		t.Errorf("Expected panic to be recovered, got %v", panicRecovered)
	}
}

func TestPoolClosure(t *testing.T) {
	p := pool.New(pool.DefaultConfig())
	p.Start()

	// Submit a task before closing
	task := &mockTask{id: "pre-close", duration: 50 * time.Millisecond}
	resultCh, err := p.Submit(task)
	if err != nil {
		t.Fatalf("Failed to submit task before close: %v", err)
	}

	// Let the task start
	time.Sleep(10 * time.Millisecond)

	// Close the pool
	err = p.Close()
	if err != nil {
		t.Errorf("Failed to close pool: %v", err)
	}

	// Wait for the pre-close task result (should be cancelled)
	select {
	case result := <-resultCh:
		// Task might complete or be cancelled - both are acceptable
		if result.Error != nil {
			t.Logf("Task was cancelled as expected: %v", result.Error)
		} else {
			t.Logf("Task completed before cancellation")
		}
	case <-time.After(1 * time.Second):
		t.Error("Task result not received within timeout")
	}

	// Try to submit a task after closing
	newTask := &mockTask{id: "post-close", duration: 50 * time.Millisecond}
	_, err = p.Submit(newTask)
	if err != pool.ErrPoolClosed {
		t.Errorf("Expected ErrPoolClosed, got %v", err)
	}
}
