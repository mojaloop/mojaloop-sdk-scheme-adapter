/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 * Modusbox
 - Vijay Kumar Guthi <vijaya.guthi@modusbox.com>
 --------------
 ******/

'use strict';

import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import {
    IRunHandler,
    KafkaCommandEventConsumer,
    KafkaDomainEventProducer,
    CommandEventMessage,
    OutboundCommandEventMessageName,
    IKafkaEventConsumerOptions,
    IKafkaEventProducerOptions,
} from '@mojaloop/sdk-scheme-adapter-private-shared-lib';
import { RedisBulkTransactionStateRepo } from '../infrastructure';
import { handleProcessSDKOutboundBulkRequest } from './handlers';
import { IBulkTransactionEntityRepo, ICommandEventHandlerOptions } from '../types';


export class OutboundEventHandler implements IRunHandler {
    private _logger: ILogger;

    private _consumer: KafkaCommandEventConsumer;

    private _domainProducer: KafkaDomainEventProducer;

    private _bulkTransactionEntityStateRepo: IBulkTransactionEntityRepo;

    private _commandEventHandlerOptions: ICommandEventHandlerOptions;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    async start(appConfig: any, logger: ILogger): Promise<void> {
        this._logger = logger;
        this._logger.info('start');

        const consumerOptions: IKafkaEventConsumerOptions = appConfig.get('KAFKA.COMMAND_EVENT_CONSUMER');
        this._consumer = new KafkaCommandEventConsumer(this._messageHandler.bind(this), consumerOptions, logger);
        logger.info(`Created kafkaConsumer of type ${this._consumer.constructor.name}`);
  
        /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
        await this._consumer.init();
        await this._consumer.start();

        const producerOptions: IKafkaEventProducerOptions = appConfig.get('KAFKA.DOMAIN_EVENT_PRODUCER');
        this._domainProducer = new KafkaDomainEventProducer(producerOptions, logger);
        logger.info(`Created kafkaProducer of type ${this._domainProducer.constructor.name}`);
        await this._domainProducer.init();

        this._bulkTransactionEntityStateRepo = new RedisBulkTransactionStateRepo(appConfig.get('REDIS.CONNECTION_URL'), this._logger);
        logger.info(`Created BulkTransactionStateRepo of type ${this._bulkTransactionEntityStateRepo.constructor.name}`);
        await this._bulkTransactionEntityStateRepo.init();

        // Create options for handlers
        this._commandEventHandlerOptions = {
            bulkTransactionEntityRepo: this._bulkTransactionEntityStateRepo,
            domainProducer: this._domainProducer,
        };
    }

    async destroy(): Promise<void> {
        await this._consumer.destroy();
        await this._domainProducer.destroy();
        await this._bulkTransactionEntityStateRepo.destroy();
    }

    async _messageHandler(message: CommandEventMessage): Promise<void> {
        this._logger.info(`${message.getName()}`);
        console.log(message);
        switch (message.getName()) {
            case OutboundCommandEventMessageName.ProcessSDKOutboundBulkRequest: {
                handleProcessSDKOutboundBulkRequest(message, this._commandEventHandlerOptions, this._logger);
                break;
            }
            default: {
                this._logger.debug(`${message?.getName()}:${message?.getKey()} - Skipping unknown outbound domain event`);
                return;
            }
        }
    }
}