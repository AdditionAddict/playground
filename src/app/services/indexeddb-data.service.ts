import { Injectable } from "@angular/core";
import { Observable, Subscriber, forkJoin } from "rxjs";
import { share, switchMap, concatMap } from "rxjs/operators";
import { ChangeType } from '@ngrx/data';
import { UpdateStr, UpdateNum } from '@ngrx/entity/src/models';

export interface ChangeTypeLogged<T> {
  changeType?: ChangeType;
  originalValue?: T;
}
export type Changed<T> = T & ChangeTypeLogged<T>;

export interface UpdatedStr<T> extends UpdateStr<T> {
  originalValue: T;
}
export interface UpdatedNum<T> extends UpdateNum<T> {
  originalValue: T;
}
export type Updated<T> = UpdatedStr<T> | UpdatedNum<T>;


@Injectable({
  providedIn: "root"
})
export class IndexeddbDataService {
  INDEXEDDB_VERSION = 12;
  INDEXEDDB_NAME = "test";

  idbConfig = {
    Status: { keyPath: "AppName" },
    Project: { keyPath: "ProjectFileNo" },
    GeneralEmployee: { keyPath: "EmployeeID" },
    Mould: { keyPath: "MouldNo" },
    ConcreteRecordHeader: { keyPath: "ConcreteRecordID" },
    ConcreteRecordLoad: { keyPath: "ConcreteRecordLoadID" }
  };

  constructor() {
    // console.log("IndexeddbDataService");
  }

  init(config, INDEXEDDB_NAME, INDEXEDDB_VERSION) {
    this.idbConfig = config;
    this.INDEXEDDB_NAME = INDEXEDDB_NAME;
    this.INDEXEDDB_VERSION = INDEXEDDB_VERSION;
  }

  addItem<T>(target, value: T): Observable<Changed<T>> {
    return this.openDB$().pipe(
      concatMap(
        db => this.storePutter<T>(db, target, value, ChangeType.Added)
      ))
  }

  addItems<T extends object>(
    target,
    values: T[]
  ): Observable<Changed<T>[]> {
    return forkJoin(values.map((value) => {
      const entity = { ...value as T, changeType: ChangeType.Added };
      return this.addItem(target, entity)
    }))
  }

  getAllData<T>(target): Observable<Changed<T>[]> {
    return this.openDB$().pipe(
      switchMap(
        db =>
          new Observable<Changed<T>[]>(subscriber => {
            const tx = db.transaction(target, "readonly");
            const store = tx.objectStore(target);
            const dataRequest = store.getAll() as IDBRequest<Changed<T>[]>;
            this.handleSuccess<Changed<T>[]>(dataRequest, subscriber, db)
            this.handleError(dataRequest, subscriber)
          })
      )
    );
  }

  getItem<T>(
    target,
    value: string | number
  ): Observable<Changed<T>> {
    return this.openDB$().pipe(
      switchMap(
        db => new Observable<Changed<T>>(subscriber => {
          const tx = db.transaction(target, "readwrite");
          const store = tx.objectStore(target);
          const dataRequest = store.get(value) as IDBRequest<IDBValidKey>;
          console.log(`db:${db}`)
          this.handleSuccess<Changed<T>>(dataRequest, subscriber, db)
          this.handleError(dataRequest, subscriber)
        })
      )
    )
  }

  updateItem<T>(
    target,
    update: Changed<T>
  ): Observable<Changed<T>> {
    return this.openDB$().pipe(
      concatMap(
        db => {
          const { originalValue: originalValue, ...value } = update
          return this.storePutter<T>(db, target, value, ChangeType.Updated, originalValue)
        }
      )
    )
  }

  updateItems<T extends object>(
    target,
    updates: Changed<T>[]
  ): Observable<Changed<T>[]> {
    return forkJoin(updates.map((update) => {
      return this.updateItem<T>(target, update)
    }))
  }


  deleteItem(
    target,
    value: string | number
  ): Observable<string | number> {
    return this.openDB$().pipe(
      concatMap(
        db => new Observable<string | number>(subscriber => {
          const tx = db.transaction(target, "readwrite");
          const store = tx.objectStore(target);
          const dataRequest = store.delete(value);
          this.handleSuccess(dataRequest, subscriber, db)
          this.handleError(dataRequest, subscriber)
        })
      )
    )
  }

  deleteItems(
    target,
    values: (string | number)[]
  ): Observable<(string | number)[]> {
    return forkJoin(values.map((value) => {
      return this.deleteItem(target, value)
    }))
  }

  openDB$(): Observable<IDBDatabase> {
    // console.log("openDB");
    const INDEXEDDB_NAME = this.INDEXEDDB_NAME
    const INDEXEDDB_VERSION = this.INDEXEDDB_VERSION

    const observable = new Observable<IDBDatabase>(subscriber => {

      const request: IDBOpenDBRequest = window.indexedDB.open(
        INDEXEDDB_NAME,
        INDEXEDDB_VERSION
      );

      this.handleSuccess<IDBDatabase>(
        request,
        subscriber
      )
      this.handleError(request, subscriber)

      request.onupgradeneeded = (event: Event) => {
        const db = (event.target as any).result;
        console.log(`IndexedDB Upgrade, Version ${INDEXEDDB_VERSION}`);
        this.upgradeDB(db);
      };

      request.onblocked = (event: Event) => {
        const blocked = (event.target as any).result;
        console.log(`onblocked::${blocked}`);
        subscriber.error(blocked);
        subscriber.complete();
      };
    });

    return observable.pipe(share()) as Observable<IDBDatabase>;
  }

  private upgradeDB(db: IDBDatabase) {
    /** Create list of current store names */
    let storeNames = [] as string[];
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const entityKey = db.objectStoreNames.item(i);
      storeNames.push(entityKey);
    }

    /** Remove non-defined stores */
    for (const entityKey of storeNames) {
      if (!Object.keys(this.idbConfig).includes(entityKey)) {
        db.deleteObjectStore(entityKey);
      }
    }

    /** Add defined stores */
    for (const entityKey of Object.keys(this.idbConfig)) {
      if (!storeNames.includes(entityKey)) {
        db.createObjectStore(entityKey, {
          keyPath: this.idbConfig[entityKey].keyPath
        });
      }
    }
  }

  deleteDB(INDEXEDDB_NAME?) {
    const idbName = INDEXEDDB_NAME ? INDEXEDDB_NAME : this.INDEXEDDB_NAME
    const request = window.indexedDB.deleteDatabase(idbName);

    request.onsuccess = (event: Event) => {
      // console.log("deleteDB::onsuccess");
    };

    request.onerror = (event: Event) => {
      console.log("deleteDB::onerror");
    };

    request.onblocked = (event: Event) => {
      console.log(`deleteDB::onblocked::${idbName}::${event}`);
    };

    request.onupgradeneeded = (event: Event) => {
      console.log("deleteDB::onupgradeneeded");
    };
  }

  private storePutter<T>(db, target, value, changeType, originalValue?) {
    return new Observable<Changed<T>>(subscriber => {
      const entity = originalValue ? {
        ...value,
        changeType,
        originalValue
      } : {
          ...value,
          changeType
        }
      const tx = db.transaction(target, "readwrite");
      const write = tx.objectStore(target).put(entity)
      this.handleSuccess<Changed<T>>(write, subscriber, db, entity)
      this.handleError(write, subscriber)
    })
  }

  private handleError<T>(idbRequest: IDBRequest, subscriber: Subscriber<T>) {
    idbRequest.onerror = (event: Event) => {
      const error = (event.target as any).error;
      // console.log(`error::${error}`);
      subscriber.error(error);
      subscriber.complete();
    };
  }

  private handleSuccess<T>(
    idbRequest: IDBRequest,
    subscriber: Subscriber<T>,
    db?: IDBDatabase,
    value?: T
  ) {
    idbRequest.onsuccess = (event: Event) => {
      const data = (event.target as any).result as T;
      // console.log(`onsuccess::${data}`);
      if (!!db) {
        // console.log(`closed db`)
        db.close()
      }
      subscriber.next(value ? value : data);
      subscriber.complete();
    };
  }

}
