import { Component } from "@angular/core";
import { IndexeddbDataService } from "./services/indexeddb-data.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "playground";

  constructor(private indexeddbDataService: IndexeddbDataService) {
    // this.indexeddbDataService.openDB$().subscribe();
    // setTimeout(() => {
    //   this.indexeddbDataService.openDB$().subscribe();
    //   this.indexeddbDataService
    //     .getAllData("Project")
    //     .subscribe(data => console.log(data));
    // }, 10);
  }
}
