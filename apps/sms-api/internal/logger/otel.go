package logger

import (
	"context"
	"fmt"
	"log/slog"
	"slices"

	"encore.dev"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/trace"
)

// Option configures a [Handler].
type (
	Option interface {
		apply(*config) *config
	}
	ContextHandler struct {
		slog.Handler

		// Code from otelslog
		// Ensure forward compatibility by explicitly making this not comparable.
		noCmp [0]func() //nolint: unused  // This is indeed used.

		attrs  *kvBuffer
		group  *group
		logger log.Logger
	}
	optFunc func(*config) *config
)

func (f optFunc) apply(c *config) *config { return f(c) }

// WithVersion returns an [Option] that configures the version of the
// [log.Logger] used by a [Handler]. The version should be the version of the
// package that is being logged.
func WithVersion(version string) Option {
	return optFunc(func(c *config) *config {
		c.version = version
		return c
	})
}

// WithSchemaURL returns an [Option] that configures the semantic convention
// schema URL of the [log.Logger] used by a [Handler]. The schemaURL should be
// the schema URL for the semantic conventions used in log records.
func WithSchemaURL(schemaURL string) Option {
	return optFunc(func(c *config) *config {
		c.schemaURL = schemaURL
		return c
	})
}

// WithLoggerProvider returns an [Option] that configures [log.LoggerProvider]
// used by a [Handler] to create its [log.Logger].
//
// By default if this Option is not provided, the Handler will use the global
// LoggerProvider.
func WithLoggerProvider(provider log.LoggerProvider) Option {
	return optFunc(func(c *config) *config {
		c.provider = provider
		return c
	})
}

func WithLevel(level slog.Level) Option {
	return optFunc(func(c *config) *config {
		c.Level = level
		return c
	})
}

func WithHandleOptions(opts *slog.HandlerOptions) Option {
	return optFunc(func(c *config) *config {
		c.HandlerOptions = opts
		return c
	})
}

type config struct {
	provider  log.LoggerProvider
	version   string
	schemaURL string
	*slog.HandlerOptions
}

func newConfig(options []Option) *config {
	c := &config{
		HandlerOptions: &slog.HandlerOptions{
			AddSource:   true,
			ReplaceAttr: replaceAttr,
		},
	}
	for _, opt := range options {
		c = opt.apply(c)
	}

	if c.provider == nil {
		c.provider = global.GetLoggerProvider()
	}

	return c
}

func (c *config) logger(name string) log.Logger {
	var opts []log.LoggerOption
	if c.version != "" {
		opts = append(opts, log.WithInstrumentationVersion(c.version))
	}
	if c.schemaURL != "" {
		opts = append(opts, log.WithSchemaURL(c.schemaURL))
	}
	return c.provider.Logger(name, opts...)
}

// group represents a group received from slog.
type group struct {
	// name is the name of the group.
	name string
	// attrs are the attributes associated with the group.
	attrs *kvBuffer
	// next points to the next group that holds this group.
	//
	// Groups are represented as map value types in OpenTelemetry. This means
	// that for an slog group hierarchy like the following ...
	//
	//   WithGroup("G").WithGroup("H").WithGroup("I")
	//
	// the corresponding OpenTelemetry log value types will have the following
	// hierarchy ...
	//
	//   KeyValue{
	//     Key: "G",
	//     Value: []KeyValue{{
	//       Key: "H",
	//       Value: []KeyValue{{
	//         Key: "I",
	//         Value: []KeyValue{},
	//       }},
	//     }},
	//   }
	//
	// When attributes are recorded (i.e. Info("msg", "key", "value") or
	// WithAttrs("key", "value")) they need to be added to the "leaf" group. In
	// the above example, that would be group "I":
	//
	//   KeyValue{
	//     Key: "G",
	//     Value: []KeyValue{{
	//       Key: "H",
	//       Value: []KeyValue{{
	//         Key: "I",
	//         Value: []KeyValue{
	//           String("key", "value"),
	//         },
	//       }},
	//     }},
	//   }
	//
	// Therefore, groups are structured as a linked-list with the "leaf" node
	// being the head of the list. Following the above example, the group data
	// representation would be ...
	//
	//   *group{"I", next: *group{"H", next: *group{"G"}}}
	next *group
}

// NextNonEmpty returns the next group within g's linked-list that has
// attributes (including g itself). If no group is found, nil is returned.
func (g *group) NextNonEmpty() *group {
	if g == nil || g.attrs.Len() > 0 {
		return g
	}
	return g.next.NextNonEmpty()
}

// KeyValue returns group g containing kvs as a [log.KeyValue]. The value of
// the returned KeyValue will be of type [log.KindMap].
//
// The passed kvs are rendered in the returned value, but are not added to the
// group.
//
// This does not check g. It is the callers responsibility to ensure g is
// non-empty or kvs is non-empty so as to return a valid group representation
// (according to slog).
func (g *group) KeyValue(kvs ...log.KeyValue) log.KeyValue {
	// Assumes checking of group g already performed (i.e. non-empty).
	out := log.Map(g.name, g.attrs.KeyValues(kvs...)...)
	g = g.next
	for g != nil {
		// A Handler should not output groups if there are no attributes.
		if g.attrs.Len() > 0 {
			out = log.Map(g.name, g.attrs.KeyValues(out)...)
		}
		g = g.next
	}
	return out
}

// Clone returns a copy of g.
func (g *group) Clone() *group {
	if g == nil {
		return g
	}
	g2 := *g
	g2.attrs = g2.attrs.Clone()
	return &g2
}

// AddAttrs add attrs to g.
func (g *group) AddAttrs(attrs []slog.Attr) {
	if g.attrs == nil {
		g.attrs = newKVBuffer(len(attrs))
	}
	g.attrs.AddAttrs(attrs)
}

type kvBuffer struct {
	data []log.KeyValue
}

func newKVBuffer(n int) *kvBuffer {
	return &kvBuffer{data: make([]log.KeyValue, 0, n)}
}

// Len returns the number of [log.KeyValue] held by b.
func (b *kvBuffer) Len() int {
	if b == nil {
		return 0
	}
	return len(b.data)
}

// Clone returns a copy of b.
func (b *kvBuffer) Clone() *kvBuffer {
	if b == nil {
		return nil
	}
	return &kvBuffer{data: slices.Clone(b.data)}
}

// KeyValues returns kvs appended to the [log.KeyValue] held by b.
func (b *kvBuffer) KeyValues(kvs ...log.KeyValue) []log.KeyValue {
	if b == nil {
		return kvs
	}
	return append(b.data, kvs...)
}

// AddAttrs adds attrs to b.
func (b *kvBuffer) AddAttrs(attrs []slog.Attr) {
	b.data = slices.Grow(b.data, len(attrs))
	for _, a := range attrs {
		_ = b.AddAttr(a)
	}
}

// AddAttr adds attr to b and returns true.
//
// This is designed to be passed to the AddAttributes method of an
// [slog.Record].
//
// If attr is a group with an empty key, its values will be flattened.
//
// If attr is empty, it will be dropped.
func (b *kvBuffer) AddAttr(attr slog.Attr) bool {
	if attr.Key == "" {
		if attr.Value.Kind() == slog.KindGroup {
			// A Handler should inline the Attrs of a group with an empty key.
			for _, a := range attr.Value.Group() {
				b.data = append(b.data, log.KeyValue{
					Key:   a.Key,
					Value: convertValue(a.Value),
				})
			}
			return true
		}

		if attr.Value.Any() == nil {
			// A Handler should ignore an empty Attr.
			return true
		}
	}
	b.data = append(b.data, log.KeyValue{
		Key:   attr.Key,
		Value: convertValue(attr.Value),
	})
	return true
}

func convertValue(v slog.Value) log.Value {
	switch v.Kind() {
	case slog.KindAny:
		return log.StringValue(fmt.Sprintf("%+v", v.Any()))
	case slog.KindBool:
		return log.BoolValue(v.Bool())
	case slog.KindDuration:
		return log.Int64Value(v.Duration().Nanoseconds())
	case slog.KindFloat64:
		return log.Float64Value(v.Float64())
	case slog.KindInt64:
		return log.Int64Value(v.Int64())
	case slog.KindString:
		return log.StringValue(v.String())
	case slog.KindTime:
		return log.Int64Value(v.Time().UnixNano())
	case slog.KindUint64:
		const maxInt64 = ^uint64(0) >> 1
		u := v.Uint64()
		if u > maxInt64 {
			return log.Float64Value(float64(u))
		}
		return log.Int64Value(int64(u)) // nolint:gosec  // Overflow checked above.
	case slog.KindGroup:
		g := v.Group()
		buf := newKVBuffer(len(g))
		buf.AddAttrs(g)
		return log.MapValue(buf.data...)
	case slog.KindLogValuer:
		return convertValue(v.Resolve())
	default:
		// Try to handle this as gracefully as possible.
		//
		// Don't panic here. The goal here is to have developers find this
		// first if a new slog.Kind is added. A test on the new kind will find
		// this malformed attribute as well as a panic. However, it is
		// preferable to have user's open issue asking why their attributes
		// have a "unhandled: " prefix than say that their code is panicking.
		return log.StringValue(fmt.Sprintf("unhandled: (%s) %+v", v.Kind(), v.Any()))
	}
}

// Handle adds contextual attributes to the Record before calling the underlying
// handler. This version automatically extracts Encore trace information.
func (h *ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	// Add fields from context
	if attrs, ok := ctx.Value(slogFields).([]slog.Attr); ok {
		for _, v := range attrs {
			r.AddAttrs(v)
		}
	}

	// Extract Encore trace information and add to record
	encoreReq := encore.CurrentRequest()
	if encoreReq.Type == encore.APICall && encoreReq.Trace != nil {
		attrs := make([]slog.Attr, 0, 4)

		if encoreReq.Trace.TraceID != "" {
			attrs = append(attrs, slog.String("trace_id", encoreReq.Trace.TraceID))
		}
		if encoreReq.Trace.SpanID != "" {
			attrs = append(attrs, slog.String("span_id", encoreReq.Trace.SpanID))
		}

		// Optional: Add service and endpoint info
		if encoreReq.Service != "" {
			attrs = append(attrs, slog.String("service", encoreReq.Service))
		}
		if encoreReq.Endpoint != "" {
			attrs = append(attrs, slog.String("endpoint", encoreReq.Endpoint))
		}

		if len(attrs) > 0 {
			r.AddAttrs(attrs...)
		}
	}

	// Check for OpenTelemetry span in context
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		h.addTraceInfoToRecord(&r, span)
		// h.addLogToSpan(r, span)
	}

	// Emit log to OTEL collector
	h.logger.Emit(ctx, h.convertRecord(r))
	return h.Handler.Handle(ctx, r)
}

func (h *ContextHandler) convertRecord(r slog.Record) log.Record {
	var record log.Record
	record.SetTimestamp(r.Time)
	record.SetBody(log.StringValue(r.Message))

	const sevOffset = slog.Level(log.SeverityDebug) - slog.LevelDebug
	record.SetSeverity(log.Severity(r.Level + sevOffset))

	if h.attrs.Len() > 0 {
		record.AddAttributes(h.attrs.KeyValues()...)
	}

	n := r.NumAttrs()
	if h.group != nil {
		if n > 0 {
			buf := newKVBuffer(n)
			r.Attrs(buf.AddAttr)
			record.AddAttributes(h.group.KeyValue(buf.KeyValues()...))
		} else {
			// A Handler should not output groups if there are no attributes.
			g := h.group.NextNonEmpty()
			if g != nil {
				record.AddAttributes(g.KeyValue())
			}
		}
	} else if n > 0 {
		buf := newKVBuffer(n)
		r.Attrs(buf.AddAttr)
		record.AddAttributes(buf.KeyValues()...)
	}

	return record
}

// Enable returns true if the Handler is enabled to log for the provided
// context and Level. Otherwise, false is returned if it is not enabled.
func (h *ContextHandler) Enabled(ctx context.Context, l slog.Level) bool {
	var record log.Record
	const sevOffset = slog.Level(log.SeverityDebug) - slog.LevelDebug
	record.SetSeverity(log.Severity(l + sevOffset))
	// return h.logger.Enabled(ctx, record)
	return true
}

// WithAttrs returns a new [slog.Handler] based on h that will log using the
// passed attrs.
func (h *ContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	h2 := *h
	if h2.group != nil {
		h2.group = h2.group.Clone()
		h2.group.AddAttrs(attrs)
	} else {
		if h2.attrs == nil {
			h2.attrs = newKVBuffer(len(attrs))
		} else {
			h2.attrs = h2.attrs.Clone()
		}
		h2.attrs.AddAttrs(attrs)
	}
	return &h2
}

// WithGroup returns a new [slog.Handler] based on h that will log all messages
// and attributes within a group of the provided name.
func (h *ContextHandler) WithGroup(name string) slog.Handler {
	h2 := *h
	h2.group = &group{name: name, next: h2.group}
	return &h2
}

func (h *ContextHandler) addTraceInfoToRecord(r *slog.Record, span trace.Span) {
	sCtx := span.SpanContext()
	attrs := make([]slog.Attr, 0)

	// Only add OpenTelemetry trace IDs if they differ from Encore's
	// (Encore's trace IDs are already added above)
	if sCtx.HasTraceID() {
		attrs = append(attrs, slog.String("otel_trace_id", sCtx.TraceID().String()))
	}
	if sCtx.HasSpanID() {
		attrs = append(attrs, slog.String("otel_span_id", sCtx.SpanID().String()))
	}
	if len(attrs) > 0 {
		r.AddAttrs(attrs...)
	}
}

func (h *ContextHandler) addLogToSpan(r slog.Record, span trace.Span) {
	attrs := []attribute.KeyValue{
		attribute.String("log.severity", r.Level.String()),
		attribute.String("log.message", r.Message),
	}

	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, attribute.String(a.Key, a.Value.String()))
		return true
	})

	span.AddEvent("log", trace.WithAttributes(attrs...))
	if r.Level >= slog.LevelError {
		span.SetStatus(codes.Error, r.Message)
	}
}
