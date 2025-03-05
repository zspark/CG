export type Event_t<T> = {
    sender: IEventSender<T>,
    type: number,
    info?: T,
};

export interface IEventReceiver<T> {
    /**
     * return true means to remove this receiver;
     */
    notify: (event: Event_t<T>) => boolean;
}

export interface IEventSender<T> {
    addReceiver: (receiver: IEventReceiver<T>, eventType: number, extra?: any) => boolean;
    removeReceiver: (receiver: IEventReceiver<T>, eventType: number) => boolean;
}

export default class EventSender<T> implements IEventSender<T> {

    protected _setEventReceiver: Map<number, Set<IEventReceiver<T>>> = new Map();

    constructor() { }

    addReceiver(receiver: IEventReceiver<T>, eventType: number, extra?: any): boolean {
        let _set = this._setEventReceiver.get(eventType);
        if (!_set) {
            _set = new Set()
            this._setEventReceiver.set(eventType, _set);
        }
        _set.add(receiver);
        return true;
    }
    removeReceiver(receiver: IEventReceiver<T>, eventType: number): boolean {
        const _set = this._setEventReceiver.get(eventType);
        return _set?.delete(receiver);
    }

    protected _broadcast(event: Event_t<T>): void {
        const _set = this._setEventReceiver.get(event.type);
        _set?.forEach((rc: IEventReceiver<T>) => {
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

