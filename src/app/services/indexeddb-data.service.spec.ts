import { TestBed } from "@angular/core/testing";

import { IndexeddbDataService } from "./indexeddb-data.service";

describe("IndexeddbDataService", () => {
  let service: IndexeddbDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexeddbDataService);
    service.deleteDB("spec-test");
  });

  afterAll(() => {
    console.log("afterAll");
    service.deleteDB("spec-test");
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should create indexeddb database", (done: DoneFn) => {
    const idbConfig = {
      Test1: { keyPath: "TestOneID" },
      Test2: { keyPath: "TestTwoID" }
    };
    const conn$ = service.openDB$(idbConfig, "spec-test", 1);
    conn$.subscribe(db => {
      expect(getStoreNames(db)).toEqual(["Test1", "Test2"]);
      db.close();
      done();
    });
  });

  it("should upgrade an indexeddb database", (done: DoneFn) => {
    const idbConfig = {
      Test1: { keyPath: "TestOneID" },
      Test2: { keyPath: "TestTwoID" }
    };

    const conn$ = service.openDB$(idbConfig, "spec-test", 1);
    conn$.subscribe(db => {
      db.close();
    });

    const idbConfig2 = {
      Test3: { keyPath: "TestThreeID" },
      Test4: { keyPath: "TestFourID" }
    };

    const conn2$ = service.openDB$(idbConfig2, "spec-test", 2);
    conn2$.subscribe(db => {
      console.log(getStoreNames(db));
      expect(getStoreNames(db)).toEqual(["Test3", "Test4"]);
      db.close();
      done();
    });
  });
});

/** Helpers */

function getStoreNames(db) {
  /** Create list of current store names */
  let storeNames = [] as string[];
  for (let i = 0; i < db.objectStoreNames.length; i++) {
    const entityKey = db.objectStoreNames.item(i);
    storeNames.push(entityKey);
  }

  return storeNames;
}
