import log from 'encore.dev/log'
import { mapAppErrorToAPIError } from '../utils/index'

export class AppError extends Error {
	constructor(
		public readonly type: AppErrorType,
		public readonly message: string
	) {
		super(message)
		this.name = 'AppError'
	}

	public static alreadyExists(msg: string) {
		return new AppError('AlreadyExists', msg)
	}

	public static invalidArgument(msg: string) {
		return new AppError('InvalidArgument', msg)
	}

	public static unavailable(msg: string) {
		return new AppError('Unavailable', msg)
	}

	public static permissionDenied(msg: string) {
		return new AppError('PermissionDenied', msg)
	}

	public static internal(msg: string) {
		return new AppError('InternalError', msg)
	}

	public static umimplemented(msg: string) {
		return new AppError('Unimplemented', msg)
	}

	public static handleAppErr(err: unknown): never {
		log.error(err, 'Error from handleAppErr!')

		if (err instanceof AppError) {
			throw mapAppErrorToAPIError(err)
		}

		// fallback (not expected to reach here)
		throw AppError.internal('Unknown error')
	}
}

export type AppErrorType =
	| 'AlreadyExists'
	| 'InvalidArgument'
	| 'Unavailable'
	| 'PermissionDenied'
	| 'InternalError'
	| 'Unimplemented'
