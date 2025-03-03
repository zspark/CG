export type Event_t = {
    sender: IEventSender,
    type: number,
    info?: any,
};

export interface IEventReceiver {
    /**
     * return true means to remove this receiver;
     */
    notify: (event: Event_t) => boolean;
}

export interface IEventSender {
    addReceiver: (receiver: IEventReceiver, eventType: number, extra?: any) => boolean;
    removeReceiver: (receiver: IEventReceiver, eventType: number) => boolean;
}

export default class EventSender implements IEventSender {

    protected _setEventReceiver: Map<number, Set<IEventReceiver>> = new Map();

    constructor() { }

    addReceiver(receiver: IEventReceiver, eventType: number, extra?: any): boolean {
        let _set = this._setEventReceiver.get(eventType);
        if (!_set) {
            _set = new Set()
            this._setEventReceiver.set(eventType, _set);
        }
        _set.add(receiver);
        return true;
    }
    removeReceiver(receiver: IEventReceiver, eventType: number): boolean {
        const _set = this._setEventReceiver.get(eventType);
        return _set?.delete(receiver);
    }

    protected _broadcast(event: Event_t): void {
        const _set = this._setEventReceiver.get(event.type);
        _set?.forEach((rc: IEventReceiver) => {
            if (rc.notify(event)) _set.delete(rc);
        });
    }
    protected _clearReceivers(eventType: number | undefined): void {
        if (eventType == undefined) {
            this._setEventReceiver = new Map();
        } else {
            this._setEventReceiver.get(eventType)?.clear();
        }
    }
}

