import { TestBed } from "@angular/core/testing";

import { IndexeddbDataService } from "./indexeddb-data.service";
import { ChangeType } from '@ngrx/data';
import { switchMap, map } from 'rxjs/operators';

interface Project {
  ProjectContractRef: string;
  ProjectContractor: string;
  ProjectFileNo: string;
  ProjectName: string;
}

describe("IndexeddbDataService", () => {
  let service: IndexeddbDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexeddbDataService);

    service.deleteDB("spec-test-create");
    service.deleteDB("spec-test-upgrade");
    service.deleteDB("spec-test-add-items");
    service.deleteDB("spec-test-add-item");
    service.deleteDB("spec-test-get-items");
    service.deleteDB("spec-test-get-item");
    service.deleteDB("spec-test-update-item");
    service.deleteDB("spec-test-delete-item");
    service.deleteDB("spec-test-deletes-item");

  });

  afterAll(() => {
    console.log("afterAll");
    service.deleteDB("spec-test-create");
    service.deleteDB("spec-test-upgrade");
    service.deleteDB("spec-test-add-items");
    service.deleteDB("spec-test-add-item");
    service.deleteDB("spec-test-get-items");
    service.deleteDB("spec-test-get-item");
    service.deleteDB("spec-test-update-item");
    service.deleteDB("spec-test-delete-item");
    service.deleteDB("spec-test-deletes-item");
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should create indexeddb database", (done: DoneFn) => {
    console.log("****************create********************")
    const idbConfig = {
      Test1: { keyPath: "TestOneID" },
      Test2: { keyPath: "TestTwoID" }
    };
    service.init(idbConfig, "spec-test-create", 1)
    const conn$ = service.openDB$();
    conn$.subscribe(db => {
      expect(getStoreNames(db)).toEqual(["Test1", "Test2"]);
      db.close();
      done();
    });
  });

  it("should upgrade an indexeddb database", (done: DoneFn) => {
    console.log("****************upgrade********************")
    const idbConfig = {
      Test1: { keyPath: "TestOneID" },
      Test2: { keyPath: "TestTwoID" }
    };
    service.init(idbConfig, "spec-test-upgrade", 1)
    const conn$ = service.openDB$();
    conn$.subscribe(db => {
      db.close();
    });

    const idbConfig2 = {
      Test3: { keyPath: "TestThreeID" },
      Test4: { keyPath: "TestFourID" }
    };

    service.init(idbConfig2, "spec-test-upgrade", 2)
    const conn2$ = service.openDB$();
    conn2$.subscribe(db => {
      expect(getStoreNames(db)).toEqual(["Test3", "Test4"]);
      db.close();
      done();
    });
  });


  it("should getItems ", (done: DoneFn) => {
    console.log("****************getItems********************")
    const { idbConfig, projects, testProjects } = getProjects();
    service.init(idbConfig, "spec-test-get-items", 1)
    service.addItems("Project", projects).subscribe(_ => {
      service.getAllData("Project").subscribe(res => {
        testProjects(res, projects)
        done();
      });
    });
  });

  it("should getItem ", (done: DoneFn) => {
    console.log("****************getItem********************")
    const { idbConfig, projects, testProjects } = getProjects();
    const pickProject = projects[2];

    service.init(idbConfig, "spec-test-get-item", 1)
    service.addItems("Project", projects).subscribe(projects => {
      console.log(`added projects::${projects}`)

      service.getItem("Project", pickProject.ProjectFileNo).subscribe(res => {
        expect(res).toEqual({ ...pickProject, changeType: ChangeType.Added })
        done();
      });
    });

  });

  it("should addItem ", (done: DoneFn) => {
    console.log("****************addItem********************")
    const { idbConfig, addedProject } = getProjects();
    service.init(idbConfig, "spec-test-add-item", 1)
    service.addItem("Project", addedProject).subscribe(res => {
      expect(res).toEqual({ ...addedProject, changeType: ChangeType.Added });
      done();
    });
  });

  it("should addItem and update if exists", (done: DoneFn) => {
    console.log("****************addItem - ignore********************")
    const { idbConfig, addedProject, } = getProjects();
    service.init(idbConfig, "spec-test-add-item", 1)

    const updated = { ...addedProject, ProjectContractRef: "Test" }
    const addOnce$ = service.addItem("Project", addedProject)
    const addAgain$ = service.addItem("Project", updated)
    const get$ = service.getItem<Project>("Project", addedProject.ProjectFileNo)

    addOnce$.pipe(
      switchMap(_ => addAgain$),
      switchMap(_ => get$)
    ).subscribe(res => {
      expect(res).toEqual({
        ...addedProject,
        ProjectContractRef: "Test",
        changeType: ChangeType.Added
      });
      done();
    });
  });


  it("should addItems ", (done: DoneFn) => {
    console.log("****************addItems********************")
    const { idbConfig, projects, testProjects } = getProjects();
    service.init(idbConfig, "spec-test-add-items", 1)
    service.addItems("Project", projects).subscribe(res => {
      testProjects(res, projects)
      done();
    });
  });

  it("should updateItem ", (done: DoneFn) => {
    console.log("****************updateItem********************")
    const { idbConfig, addedProject } = getProjects();

    service.init(idbConfig, "spec-test-update-item", 1)
    const add$ = service.addItem("Project", addedProject)

    const update = {
      ...addedProject,
      ProjectContractRef: "Test",
      originalValue: {
        ...addedProject
      }
    }
    const update$ = service.updateItem("Project", update)
    const get$ = service.getItem<Project>("Project", addedProject.ProjectFileNo)

    add$.pipe(
      switchMap(_ => update$),
      switchMap(_ => get$)
    ).subscribe(res => {
      expect(res).toEqual({
        ...addedProject,
        ProjectContractRef: "Test",
        changeType: ChangeType.Updated,
        originalValue: {
          ...addedProject
        }
      });
      done();
    });
  });

  it("should deleteItem ", (done: DoneFn) => {
    console.log("****************deleteItem********************")
    const { idbConfig, projects, deletedProjectKey, projectsWithDelete, projectSort } = getProjects();

    service.init(idbConfig, "spec-test-delete-item", 1)
    const adds$ = service.addItems("Project", projects)
    const delete$ = service.deleteItem("Project", deletedProjectKey)
    const gets$ = service.getAllData<Project>("Project")

    adds$.pipe(
      switchMap(_ => delete$),
      switchMap(_ => gets$),
    ).subscribe(res => {
      expect(res.sort(projectSort)).toEqual(projectsWithDelete.map(
        p => ({
          ProjectContractRef: p.ProjectContractRef,
          ProjectContractor: p.ProjectContractor,
          ProjectFileNo: p.ProjectFileNo,
          ProjectName: p.ProjectName,
          changeType: 1
        })
      )
        .sort(projectSort)
      )
      done();
    });
  });


  it("should deleteItems", (done: DoneFn) => {
    console.log("****************deleteItems********************")
    const { idbConfig, projects, projectSort } = getProjects();

    const deletedProjectKeys = [1, 3, 5].map(idx => projects[idx].ProjectFileNo)
    const projectsWithDeletes = projects.filter(p => !deletedProjectKeys.includes(p.ProjectFileNo))

    service.init(idbConfig, "spec-test-delete-items", 1)
    const adds$ = service.addItems("Project", projects)
    const deletes$ = service.deleteItems("Project", deletedProjectKeys)
    const gets$ = service.getAllData<Project>("Project")

    adds$.pipe(
      switchMap(_ => deletes$),
      switchMap(_ => gets$),
    ).subscribe(res => {
      expect(res.sort(projectSort)).toEqual(projectsWithDeletes.map(
        p => ({
          ProjectContractRef: p.ProjectContractRef,
          ProjectContractor: p.ProjectContractor,
          ProjectFileNo: p.ProjectFileNo,
          ProjectName: p.ProjectName,
          changeType: 1
        })
      )
        .sort(projectSort)
      )
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

function getProjects() {
  const idbConfig = {
    Project: { keyPath: "ProjectFileNo" }
  };
  const addedProject = {
    ProjectContractRef: "M1 JCT 23-25",
    ProjectContractor: "Costain",
    ProjectFileNo: "5517C",
    ProjectName: "M1 Junction 23a - 25 Smart Motorways"
  };
  const projects = [
    {
      ProjectContractRef: "M1 JCT 23-25",
      ProjectContractor: "Costain",
      ProjectFileNo: "5517C",
      ProjectName: "M1 Junction 23a - 25 Smart Motorways"
    },
    {
      ProjectContractRef: "M60 - M62 Smart Motorway",
      ProjectContractor: "MSM",
      ProjectFileNo: "5186C",
      ProjectName: "M60 - M62 Manchester Smart Motorway"
    },
    {
      ProjectContractRef: "M6 JCT 2-4",
      ProjectContractor: "Balfour Beatty Vinci JV",
      ProjectFileNo: "5459C",
      ProjectName: "M6 Junction 2 - 4 Smart Motorways"
    },
    {
      ProjectContractRef: "M6 JCT 13\u201315",
      ProjectContractor: "Kier",
      ProjectFileNo: "5505C",
      ProjectName: "M6 Junction 13 \u2013 15"
    },
    {
      ProjectContractRef: "Manchester Airport BsecB",
      ProjectContractor: "Laing O\u2019Rourke",
      ProjectFileNo: "5690C",
      ProjectName: "Manchester Airport BsecB"
    },
    {
      ProjectContractRef: "M20 Project Block",
      ProjectContractor: "Balfour Beatty",
      ProjectFileNo: "5671A",
      ProjectName: "M20 Project Block"
    }
  ];
  const deletedProjectKey = "5459C";
  const projectsWithDelete = projects.filter(
    p => p.ProjectFileNo !== deletedProjectKey
  );
  const projectsWithAdd = [...projects, addedProject];

  function testProjects(res, projects) {
    expect(
      res.sort((a, b) => a.ProjectFileNo.localeCompare(b.ProjectFileNo))
    ).toEqual(
      projects.map(p => ({ ...p, changeType: ChangeType.Added })).sort((a, b) => a.ProjectFileNo.localeCompare(b.ProjectFileNo))
    );
  }

  function projectSort(a, b) {
    return a.ProjectFileNo.localeCompare(b.ProjectFileNo)
  }
  return {
    idbConfig,
    projects,
    addedProject,
    deletedProjectKey,
    projectsWithDelete,
    projectsWithAdd,
    testProjects,
    projectSort
  }
}
