package logger

import (
	"context"
	"log/slog"

	"encore.dev/rlog"
)

var _ Logger = (*RlogLogger)(nil)

type RlogLogger struct{}

// Debug implements Logger.
func (r *RlogLogger) Debug(msg string, keysAndValues ...any) {
	rlog.Debug(msg, keysAndValues...)
}

// DebugContext implements Logger.
func (r *RlogLogger) DebugContext(ctx context.Context, msg string, keysAndValues ...any) {
	rlog.Debug(msg, keysAndValues...)
}

// Error implements Logger.
func (r *RlogLogger) Error(msg string, keysAndValues ...any) {
	rlog.Error(msg, keysAndValues...)
}

// ErrorContext implements Logger.
func (r *RlogLogger) ErrorContext(ctx context.Context, msg string, keysAndValues ...any) {
	rlog.Error(msg, keysAndValues...)
}

// Info implements Logger.
func (r *RlogLogger) Info(msg string, keysAndValues ...any) {
	rlog.Info(msg, keysAndValues...)
}

// InfoContext implements Logger.
func (r *RlogLogger) InfoContext(ctx context.Context, msg string, keysAndValues ...any) {
	rlog.Info(msg, keysAndValues...)
}

// Log implements Logger.
func (r *RlogLogger) Log(
	ctx context.Context,
	logLevel slog.Leveler,
	msg string,
	keysAndValues ...any,
) {
	switch logLevel.Level() {
	case slog.LevelInfo:
		r.Info(msg, keysAndValues...)
	case slog.LevelError:
		r.Error(msg, keysAndValues...)
	case slog.LevelDebug:
		r.Debug(msg, keysAndValues...)
	case slog.LevelWarn:
		r.Warn(msg, keysAndValues...)
	}
}

// LogAttrs implements Logger.
func (r *RlogLogger) LogAttrs(context.Context, slog.Leveler, string, ...any) {
	panic("unimplemented")
}

// Warn implements Logger.
func (r *RlogLogger) Warn(msg string, keysAndValues ...any) {
	rlog.Warn(msg, keysAndValues)
}

// WarnContext implements Logger.
func (r *RlogLogger) WarnContext(ctx context.Context, msg string, keysAndValues ...any) {
	rlog.Warn(msg, keysAndValues)
}

func NewRlogLogger() *RlogLogger {
	return &RlogLogger{}
}
