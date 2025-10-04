import log from 'encore.dev/log'
import { Logger } from '.'

/**
 * Adapter for Encore logger
 */
export class EncoreLoggerAdapter implements Logger {
	info(message: string, context?: Record<string, any>): void {
		if (context) {
			log.info(message, context)
		} else {
			log.info(message)
		}
	}

	error(message: string, context?: Record<string, any>): void {
		if (context) {
			log.error(message, context)
		} else {
			log.error(message)
		}
	}
}

// Export singleton instance
export const logger = new EncoreLoggerAdapter()
