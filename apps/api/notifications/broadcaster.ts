import { StreamOut } from 'encore.dev/api'
import log from 'encore.dev/log'
import { Message } from './notifications'

export default class NotificationBroadcaster {
	private connectedStreams: Map<number, StreamOut<Message>[]> = new Map()

	/**
	 * Add a stream connection for a user
	 */
	addStream(userId: number, stream: StreamOut<Message>): void {
		log.trace(`Adding notification stream for user ${userId}`)
		const streams = this.connectedStreams.get(userId) || []
		streams.push(stream)
		this.connectedStreams.set(userId, streams)
	}

	/**
	 * Remove a specific stream for a user
	 */
	removeStream(userId: number, stream: StreamOut<Message>): void {
		log.trace(`Removing notification stream for user ${userId}`)
		const userStreams = this.connectedStreams.get(userId) || []
		const index = userStreams.indexOf(stream)

		if (index > -1) {
			userStreams.splice(index, 1)

			if (userStreams.length === 0) {
				this.connectedStreams.delete(userId)
				log.trace(
					`No more streams for user ${userId}, removing from map`
				)
			} else {
				this.connectedStreams.set(userId, userStreams)
			}
		}
	}

	/**
	 * Remove all streams for a user
	 */
	removeAllStreamsForUser(userId: number): void {
		log.trace(`Removing all notification streams for user ${userId}`)
		this.connectedStreams.delete(userId)
	}

	/**
	 * Get all active streams for a user
	 */
	getUserStreams(userId: number): StreamOut<Message>[] {
		return this.connectedStreams.get(userId) || []
	}

	/**
	 * Get the number of active streams for a user
	 */
	getUserStreamCount(userId: number): number {
		return this.getUserStreams(userId).length
	}

	/**
	 * Get total number of active connections across all users
	 */
	getTotalConnectionCount(): number {
		let total = 0
		for (const streams of this.connectedStreams.values()) {
			total += streams.length
		}
		return total
	}

	/**
	 * Get all connected user IDs
	 */
	getConnectedUserIds(): number[] {
		return Array.from(this.connectedStreams.keys())
	}

	/**
	 * Check if a user has any active streams
	 */
	hasActiveStreams(userId: number): boolean {
		return this.getUserStreamCount(userId) > 0
	}

	/**
	 * Send a message to all streams for a specific user
	 */
	async sendToUser(userId: number, message: Message): Promise<void> {
		const streams = this.getUserStreams(userId)

		if (streams.length === 0) {
			log.trace(`No active streams for user ${userId}`)
			return
		}

		log.trace(
			`Sending message to ${streams.length} streams for user ${userId}`,
			{ message }
		)
		const activeStreams: StreamOut<Message>[] = []

		for (const stream of streams) {
			try {
				await stream.send(message)
				activeStreams.push(stream)
				log.trace(`Successfully sent message to user ${userId}`)
			} catch (err) {
				log.error(
					`Failed to send message to user ${userId}, removing dead stream`,
					{ err }
				)
				// Stream is likely dead, don't add to activeStreams
			}
		}

		// Update the streams list, keeping only the ones that worked
		if (activeStreams.length > 0) {
			this.connectedStreams.set(userId, activeStreams)
		} else {
			this.connectedStreams.delete(userId)
			log.trace(`All streams failed for user ${userId}, removed from map`)
		}
	}

	/**
	 * Send a ping/heartbeat message to all streams for a user
	 */
	async sendPingToUser(
		userId: number,
		payload: string = 'ping'
	): Promise<void> {
		await this.sendToUser(userId, {
			type: 'ping',
			data: { message: payload, title: payload, userId }
		})
	}

	/**
	 * Broadcast a message to all connected users
	 */
	async broadcastToAll(message: Message): Promise<void> {
		const userIds = this.getConnectedUserIds()
		log.trace(`Broadcasting message to ${userIds.length} users`, {
			message
		})

		const broadcastPromises = userIds.map((userId) =>
			this.sendToUser(userId, message)
		)
		await Promise.allSettled(broadcastPromises)
	}

	/**
	 * Broadcast to multiple specific users
	 */
	async broadcastToUsers(userIds: number[], message: Message): Promise<void> {
		log.trace(`Broadcasting message to ${userIds.length} specific users`, {
			message,
			userIds
		})

		const broadcastPromises = userIds.map((userId) =>
			this.sendToUser(userId, message)
		)
		await Promise.allSettled(broadcastPromises)
	}

	/**
	 * Clean up dead connections for all users
	 */
	async cleanupDeadConnections(): Promise<void> {
		log.trace('Starting cleanup of dead connections')
		const userIds = this.getConnectedUserIds()

		for (const userId of userIds) {
			await this.sendPingToUser(userId, 'cleanup-ping')
		}

		log.trace('Finished cleanup of dead connections')
	}

	/**
	 * Get statistics about active connections
	 */
	getConnectionStats(): {
		totalConnections: number
		connectedUsers: number
		userConnectionCounts: Record<number, number>
	} {
		const userConnectionCounts: Record<number, number> = {}

		for (const [userId, streams] of this.connectedStreams.entries()) {
			userConnectionCounts[userId] = streams.length
		}

		return {
			totalConnections: this.getTotalConnectionCount(),
			connectedUsers: this.getConnectedUserIds().length,
			userConnectionCounts
		}
	}

	/**
	 * Handle stream cleanup when connection ends
	 */
	handleStreamDisconnect(userId: number, stream: StreamOut<Message>): void {
		this.removeStream(userId, stream)
	}
}
