package logger

import (
	"context"
	"log/slog"
	"runtime"

	"encore.dev/rlog"
)

// RlogHandler implements slog.Handler backed by rlog.
type RlogHandler struct {
	opts  *slog.HandlerOptions
	attrs []slog.Attr
	group string
}

var _ slog.Handler = (*RlogHandler)(nil)

func NewRlogHandler(opts *slog.HandlerOptions) *RlogHandler {
	if opts == nil {
		opts = &slog.HandlerOptions{}
	}
	return &RlogHandler{opts: opts}
}

func (h *RlogHandler) Enabled(_ context.Context, level slog.Level) bool {
	if h.opts != nil && h.opts.Level != nil {
		return level >= h.opts.Level.Level()
	}
	return true
}

func (h *RlogHandler) Handle(_ context.Context, r slog.Record) error {
	args := make([]any, 0, len(h.attrs)*2+r.NumAttrs()*2)

	// include persistent attrs
	for _, a := range h.attrs {
		args = append(args, a.Key, resolveValue(a.Value))
	}

	// include record attrs
	r.Attrs(func(a slog.Attr) bool {
		args = append(args, a.Key, resolveValue(a.Value))
		return true
	})

	// include source info if enabled
	if h.opts != nil && h.opts.AddSource && r.PC != 0 {
		fs := frame(r.PC)
		args = append(args, "source", fs.File, "line", fs.Line, "func", fs.Function)
	}

	// prefix group if present
	if h.group != "" {
		for i := 0; i < len(args); i += 2 {
			args[i] = h.group + "." + args[i].(string)
		}
	}

	// route to rlog
	switch {
	case r.Level >= slog.LevelError:
		rlog.Error(r.Message, args...)
	case r.Level >= slog.LevelWarn:
		rlog.Warn(r.Message, args...)
	case r.Level >= slog.LevelInfo:
		rlog.Info(r.Message, args...)
	default:
		rlog.Debug(r.Message, args...)
	}

	return nil
}

func (h *RlogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	// copy handler
	h2 := *h
	h2.attrs = append(append([]slog.Attr{}, h.attrs...), attrs...)
	return &h2
}

func (h *RlogHandler) WithGroup(name string) slog.Handler {
	h2 := *h
	if h2.group != "" {
		h2.group = h2.group + "." + name
	} else {
		h2.group = name
	}
	return &h2
}

// ---- helpers ----

func resolveValue(v slog.Value) any {
	if v.Kind() == slog.KindLogValuer {
		return resolveValue(v.Resolve()) // recursive, resolves to concrete
	}
	switch v.Kind() {
	case slog.KindString:
		return v.String()
	case slog.KindBool:
		return v.Bool()
	case slog.KindInt64:
		return v.Int64()
	case slog.KindUint64:
		return v.Uint64()
	case slog.KindFloat64:
		return v.Float64()
	case slog.KindDuration:
		return v.Duration()
	case slog.KindTime:
		return v.Time()
	case slog.KindGroup:
		// flatten groups into map
		m := make(map[string]any, len(v.Group()))
		for _, a := range v.Group() {
			m[a.Key] = resolveValue(a.Value)
		}
		return m
	case slog.KindAny:
		return v.Any()
	default:
		return v.Any()
	}
}

type frameInfo struct {
	File, Function string
	Line           int
}

func frame(pc uintptr) frameInfo {
	fn := runtime.FuncForPC(pc)
	if fn == nil {
		return frameInfo{}
	}
	file, line := fn.FileLine(pc)
	return frameInfo{
		File:     file,
		Function: fn.Name(),
		Line:     line,
	}
}
