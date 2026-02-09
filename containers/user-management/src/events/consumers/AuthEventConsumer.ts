/**
 * Auth Event Consumer
 * Consumes auth.login.success, auth.login.failed, user.registered and updates user-management state.
 */

import amqp from 'amqplib';
import { getConfig } from '../../config';
import * as userService from '../../services/UserService';
import { log } from '../../utils/logger';

interface AuthEvent {
  type: string;
  userId?: string;
  data?: { userId?: string; email?: string };
}

export class AuthEventConsumer {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: amqp.Channel | null = null;
  private isShuttingDown = false;

  async start(): Promise<void> {
    const config = getConfig();
    const rabbitmq = config.rabbitmq as { url?: string; exchange?: string; queue?: string; bindings?: string[] } | undefined;
    if (!rabbitmq?.url) {
      log.warn('RabbitMQ URL not configured, skipping auth event consumer', { service: 'user-management' });
      return;
    }

    const { url, exchange = 'coder_events', queue = 'user_management_service', bindings = [] } = rabbitmq;
    if (bindings.length === 0) {
      log.warn('No RabbitMQ bindings for auth events', { service: 'user-management' });
      return;
    }

    try {
      const conn = await amqp.connect(url);
      this.connection = conn;
      this.channel = await conn.createChannel();

      conn.on('error', (err) => {
        if (!this.isShuttingDown) log.error('RabbitMQ connection error', err, { service: 'user-management' });
      });
      conn.on('close', () => {
        if (!this.isShuttingDown) log.warn('RabbitMQ connection closed', { service: 'user-management' });
      });

      const channel = this.channel;
      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertQueue(queue, { durable: true });
      for (const pattern of bindings) {
        await channel.bindQueue(queue, exchange, pattern);
      }
      await channel.prefetch(10);

      await channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          await this.handleMessage(msg, channel);
          channel.ack(msg);
        } catch (error) {
          log.error('Error processing auth event', error, { routingKey: msg.fields.routingKey, service: 'user-management' });
          channel.nack(msg, false, false);
        }
      });

      log.info('Auth event consumer started', { queue, exchange, bindings, service: 'user-management' });
    } catch (error) {
      log.error('Failed to start auth event consumer', error, { service: 'user-management' });
    }
  }

  private async handleMessage(msg: amqp.ConsumeMessage, channel: amqp.Channel): Promise<void> {
    const routingKey = msg.fields.routingKey;
    let event: AuthEvent;
    try {
      event = JSON.parse(msg.content.toString()) as AuthEvent;
    } catch {
      log.warn('Invalid JSON in auth event', { routingKey, service: 'user-management' });
      return;
    }

    const userId = event.userId ?? event.data?.userId;
    const email = event.data?.email;

    if (routingKey === 'auth.login.success' && userId) {
      try {
        await userService.updateLastLogin(userId);
        log.debug('Updated last login', { userId, service: 'user-management' });
      } catch (err) {
        log.warn('Failed to update last login', { userId, error: err, service: 'user-management' });
      }
      return;
    }

    if (routingKey === 'auth.login.failed') {
      // Optional: track failed attempts; for now just ack
      return;
    }

    if (routingKey === 'user.registered' && userId && email) {
      try {
        await userService.ensureUserProfileFromRegistration(userId, email);
        log.debug('Ensured user profile from registration', { userId, service: 'user-management' });
      } catch (err) {
        log.warn('Failed to ensure user profile from registration', { userId, error: err, service: 'user-management' });
      }
      return;
    }
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await (this.connection as unknown as { close(): Promise<void> }).close();
    } catch (error) {
      log.error('Error closing auth event consumer', error, { service: 'user-management' });
    }
    this.channel = null;
    this.connection = null;
  }
}
