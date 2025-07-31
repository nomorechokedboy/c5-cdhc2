import { LibsqlError } from '@libsql/client'
import { DrizzleQueryError } from 'drizzle-orm/errors'
import { APIError } from 'encore.dev/api'
import log from 'encore.dev/log'
import { AppError } from '../errors/index'

export type SQLiteErrorCode =
	| 'SQLITE_CONSTRAINT_UNIQUE'
	| 'SQLITE_BUSY'
	| 'SQLITE_CONSTRAINT'
	| 'SQLITE_CONSTRAINT_NOTNULL'
	| 'SQLITE_READONLY'
	| 'SQLITE_CANTOPEN'
	| 'SQLITE_CORRUPT'
	| 'SQLITE_MISMATCH'
	| 'SQLITE_AUTH'
	| 'SQLITE_NOTADB'
	| 'SQLITE_RANGE'
	| 'SQLITE_TOOBIG'
	| 'SQLITE_ERROR'

function handleLibsqlError(code: SQLiteErrorCode): AppError {
	switch (code) {
		case 'SQLITE_CONSTRAINT_UNIQUE':
			return AppError.alreadyExists(`Duplicate name`)

		case 'SQLITE_ERROR':
			return AppError.internal('Internal err')

		case 'SQLITE_CONSTRAINT_NOTNULL':
			return AppError.invalidArgument(
				'A required field was null'
			)

		case 'SQLITE_BUSY':
			return AppError.unavailable(
				'Database is busy, try again'
			)

		case 'SQLITE_CANTOPEN':
			return AppError.internal('Could not open database file')

		case 'SQLITE_READONLY':
			return AppError.permissionDenied(
				'Database is read-only'
			)

		case 'SQLITE_MISMATCH':
			return AppError.internal('Type mismatch in query')

		case 'SQLITE_AUTH':
			return AppError.permissionDenied('Not authorized')

		case 'SQLITE_NOTADB':
			return AppError.internal(
				'File is not a valid SQLite database'
			)

		case 'SQLITE_CORRUPT':
			return AppError.internal('Database file is corrupt')

		case 'SQLITE_TOOBIG':
			return AppError.internal('Query or data too large')

		case 'SQLITE_RANGE':
			return AppError.invalidArgument(
				'Parameter index out of range'
			)

		case 'SQLITE_CONSTRAINT':
			return AppError.invalidArgument(
				'Database constraint violated'
			)

		default:
			return AppError.internal(
				`Unhandled SQLite error: ${code}`
			)
	}
}

export function mapAppErrorToAPIError(error: AppError): APIError {
	switch (error.type) {
		case 'AlreadyExists':
			return APIError.alreadyExists(error.message)
		case 'InvalidArgument':
			return APIError.invalidArgument(error.message)
		case 'Unavailable':
			return APIError.unavailable(error.message)
		case 'PermissionDenied':
			return APIError.permissionDenied(error.message)
		case 'Unimplemented':
			return APIError.unimplemented(error.message)
		case 'InternalError':
		default:
			return APIError.internal(error.message)
	}
}

export function handleDatabaseErr(err: unknown): never {
	log.error(err, 'handleDatabaseErr: ')

	if (!(err instanceof DrizzleQueryError)) {
		throw AppError.internal('Internal error')
	}

	const libsqlErr = err.cause
	if (!(libsqlErr instanceof LibsqlError)) {
		throw AppError.internal('Internal error')
	}

	const appErr = handleLibsqlError(libsqlErr.code as SQLiteErrorCode)
	throw appErr
}
