import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiTableService } from 'eo/workbench/browser/src/app/modules/api-shared/api-table.service';
import { ApiTableConf } from 'eo/workbench/browser/src/app/modules/api-shared/api.model';
import { BodyParam } from 'eo/workbench/browser/src/app/shared/services/storage/db/models/apiData';

@Component({
  selector: 'eo-api-edit-form',
  template: `<div class="param-box-header flex items-center h-10" *ngIf="module !== 'rest'">
      <params-import [(baseData)]="model" (baseDataChange)="changeFn($event)" [contentType]="module"></params-import>
    </div>
    <eo-ng-table-pro
      [columns]="listConf.columns"
      [nzDataItem]="itemStructure"
      [setting]="listConf.setting"
      [(nzData)]="model"
      (nzDataChange)="modelChange.emit($event)"
    ></eo-ng-table-pro> `
})
export class ApiEditFormComponent implements OnInit {
  @Input() model: BodyParam[];
  /**
   * Table ID
   */
  @Input() tid: string;
  @Input() module: 'rest' | 'header' | 'query';
  @Output() readonly modelChange: EventEmitter<any> = new EventEmitter();
  listConf: ApiTableConf = {
    columns: [],
    setting: {}
  };
  itemStructure: BodyParam = {
    name: '',
    isRequired: 1,
    paramAttr: {
      example: ''
    },
    description: ''
  };
  constructor(private apiTable: ApiTableService) {}

  ngOnInit(): void {
    this.initListConf();
  }
  changeFn($event) {
    this.modelChange.emit(this.model);
  }
  private initListConf() {
    const config = this.apiTable.initTable(
      {
        in: this.module,
        isEdit: true,
        id: this.tid
      },
      {
        changeFn: () => {
          this.modelChange.emit(this.model);
        }
      }
    );
    this.listConf.columns = config.columns;
    this.listConf.setting = config.setting;
  }
}
