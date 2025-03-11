export type Event_t = {
    sender: IEventDispatcher,
    type: number,
    data?: any,
};

export interface IEventListener {
    /**
     * return true means to remove this listener;
     */
    notify: (event: Event_t) => boolean;
}

export interface IEventDispatcher {
    addListener: (listener: IEventListener, eventType: number, extra?: any) => boolean;
    removeListener: (listener: IEventListener, eventType: number) => boolean;
}

export default class EventDispatcher implements IEventDispatcher {

    protected _setEventReceiver: Map<number, Set<IEventListener>> = new Map();

    constructor() { }

    addListener(listener: IEventListener, eventType: number, extra?: any): boolean {
        let _set = this._setEventReceiver.get(eventType);
        if (!_set) {
            _set = new Set()
            this._setEventReceiver.set(eventType, _set);
        }
        _set.add(listener);
        return true;
    }
    removeListener(listener: IEventListener, eventType: number): boolean {
        const _set = this._setEventReceiver.get(eventType);
        return _set?.delete(listener);
    }

    protected _broadcast(event: Event_t): void {
        const _set = this._setEventReceiver.get(event.type);
        _set?.forEach((rc: IEventListener) => {
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

