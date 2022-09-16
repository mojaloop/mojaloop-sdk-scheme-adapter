'use strict';

import { CommandEvent } from '../command_event';
import { IMessageHeader } from '@mojaloop/platform-shared-lib-messaging-types-lib';

export interface IProcessBulkTransfersCallbackCmdEvtData {
    bulkId: string;
    content: null;
    timestamp: number | null;
    headers: IMessageHeader[] | null;
}
export class ProcessBulkTransfersCallbackCmdEvt extends CommandEvent {
    constructor(data: IProcessBulkTransfersCallbackCmdEvtData) {
        super({
            key: data.bulkId,
            timestamp: data.timestamp,
            headers: data.headers,
            content: null,
            name: ProcessBulkTransfersCallbackCmdEvt.name,
        });
    }

    static CreateFromCommandEvent(message: CommandEvent): ProcessBulkTransfersCallbackCmdEvt {
        if((message.getKey() === null || typeof message.getKey() !== 'string')) {
            throw new Error('Bulk id is in unknown format');
        }
        const data: IProcessBulkTransfersCallbackCmdEvtData = {
            timestamp: message.getTimeStamp(),
            headers: message.getHeaders(),
            content: message.getContent() as IProcessBulkTransfersCallbackCmdEvtData['content'],
            bulkId: message.getKey(),
        };
        return new ProcessBulkTransfersCallbackCmdEvt(data);
    }
}