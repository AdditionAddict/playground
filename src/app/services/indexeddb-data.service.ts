import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { share, switchMap, tap, mergeMap, delay, first } from "rxjs/operators";

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

  db: IDBDatabase;

  constructor() {
    console.log("IndexeddbDataService");
  }

  getAllData<T>(target): Observable<T[]> {
    return this.openDB$().pipe(
      switchMap(
        db =>
          new Observable<T[]>(subscriber => {
            const tx = db.transaction(target, "readonly");
            const store = tx.objectStore(target);
            const dataRequest = store.getAll() as IDBRequest<T[]>;

            dataRequest.onsuccess = (event: Event) => {
              const data = (event.target as any).result as T[];
              subscriber.next(data);
              subscriber.complete();
            };

            dataRequest.onerror = (event: Event) => {
              const error = (event.target as any).error;
              subscriber.error(error);
              subscriber.complete();
            };
          })
      )
    );
  }

  openDB$(
    config = this.idbConfig as any,
    INDEXEDDB_NAME = this.INDEXEDDB_NAME,
    INDEXEDDB_VERSION = this.INDEXEDDB_VERSION
  ): Observable<IDBDatabase> {
    console.log("openDB");
    const observable = new Observable(subscriber => {
      /** Use existing */
      if (!!this.db) {
        console.log("e");
        subscriber.next(this.db);
        subscriber.complete();
      }

      const request: IDBOpenDBRequest = window.indexedDB.open(
        INDEXEDDB_NAME,
        INDEXEDDB_VERSION
      );

      request.onsuccess = (event: Event) => {
        console.log("onsuccess");
        const db: IDBDatabase = (event.target as any).result;
        this.db = db;
        subscriber.next(db);
        subscriber.complete();
      };

      request.onerror = (event: Event) => {
        const error = (event.target as any).error;
        console.log(`error::${error}`);
        subscriber.error(error);
        subscriber.complete();
      };

      request.onupgradeneeded = (event: Event) => {
        const db = (event.target as any).result;
        console.log(`IndexedDB Upgrade, Version ${INDEXEDDB_VERSION}`);
        this.upgradeDB(db, config);
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

  private upgradeDB(db: IDBDatabase, config = this.idbConfig) {
    /** Create list of current store names */
    let storeNames = [] as string[];
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const entityKey = db.objectStoreNames.item(i);
      storeNames.push(entityKey);
    }

    /** Remove non-defined stores */
    for (const entityKey of storeNames) {
      if (!Object.keys(config).includes(entityKey)) {
        db.deleteObjectStore(entityKey);
      }
    }

    /** Add defined stores */
    for (const entityKey of Object.keys(config)) {
      if (!storeNames.includes(entityKey)) {
        db.createObjectStore(entityKey, {
          keyPath: config[entityKey].keyPath
        });
      }
    }
  }

  deleteDB(INDEXEDDB_NAME = this.INDEXEDDB_NAME) {
    const request = window.indexedDB.deleteDatabase(INDEXEDDB_NAME);

    request.onsuccess = (event: Event) => {
      console.log("deleteDB::onsuccess");
    };

    request.onerror = (event: Event) => {
      console.log("deleteDB::onerror");
    };

    request.onblocked = (event: Event) => {
      console.log(`deleteDB::onblocked::${event.target}`);
    };

    request.onupgradeneeded = (event: Event) => {
      console.log("deleteDB::onupgradeneeded");
    };
  }
}
