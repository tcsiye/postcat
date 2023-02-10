import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EoNgFeedbackMessageService } from 'eo-ng-feedback';
import { TabViewComponent } from 'eo/workbench/browser/src/app/modules/eo-ui/tab/tab.model';
import { ApiService } from 'eo/workbench/browser/src/app/shared/services/storage/api.service';
import { StoreService } from 'eo/workbench/browser/src/app/shared/store/state.service';
import { fromEvent, Subject, takeUntil } from 'rxjs';

import { ColumnItem } from '../../../../../../modules/eo-ui/table-pro/table-pro.model';
import { Environment } from '../../../../../../shared/services/storage/index.model';
import { eoDeepCopy, JSONParse } from '../../../../../../utils/index.utils';
import { ApiEffectService } from '../../service/store/api-effect.service';
import { ApiStoreService } from '../../service/store/api-state.service';

export type EnvironmentView = Partial<Environment>;
@Component({
  selector: 'eo-env-edit',
  templateUrl: './env-edit.component.html',
  styleUrls: ['./env-edit.component.scss']
})
export class EnvEditComponent implements OnDestroy, TabViewComponent {
  @Input() model: EnvironmentView;
  @Input() initialModel: EnvironmentView;
  @Output() readonly modelChange = new EventEmitter<EnvironmentView>();
  @Output() readonly eoOnInit = new EventEmitter<EnvironmentView>();
  @Output() readonly afterSaved = new EventEmitter<EnvironmentView>();
  varName = $localize`{{Variable Name}}`;
  envDataItem = { name: '', value: '', description: '' };
  envListColumns: ColumnItem[] = [
    { title: $localize`Name`, type: 'input', key: 'name' },
    { title: $localize`Value`, type: 'input', key: 'value' },
    { title: $localize`:@@Description:Description`, type: 'input', key: 'description' },
    {
      title: $localize`Operate`,
      type: 'btnList',
      width: 170,
      right: true,
      btns: [
        {
          action: 'delete'
        }
      ]
    }
  ];
  isSaving = false;
  validateForm: FormGroup;
  @ViewChild('envParams')
  envParamsComponent: any;
  private destroy$: Subject<void> = new Subject<void>();
  constructor(
    private api: ApiService,
    private effect: ApiEffectService,
    private store: ApiStoreService,
    public globalStore: StoreService,
    private fb: FormBuilder,
    private message: EoNgFeedbackMessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initShortcutKey();
    this.initForm();
  }
  initShortcutKey() {
    fromEvent(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: KeyboardEvent) => {
        const { ctrlKey, metaKey, code } = event;
        // 判断 Ctrl+S
        if ([ctrlKey, metaKey].includes(true) && code === 'KeyS') {
          // 或者 return false;
          event.preventDefault();
          this.saveEnv();
        }
      });
  }
  formatEnvData(data) {
    const result = eoDeepCopy(data);
    const parameters = this.envParamsComponent.getPureNzData()?.filter(it => it.name || it.value);
    return { ...result, parameters };
  }
  private checkForm(): boolean {
    if (this.validateForm.status === 'INVALID') {
      return false;
    }
    return true;
  }
  async saveEnv() {
    const uuid = Number(this.route.snapshot.queryParams.uuid);
    if (!this.checkForm()) {
      return;
    }
    this.isSaving = true;
    const formdata = this.formatEnvData(this.model);
    this.initialModel = eoDeepCopy(formdata);
    formdata.parameters = JSON.stringify(formdata.parameters);
    const operateMUI = {
      edit: {
        params: [formdata, uuid],
        success: $localize`Edited successfully`,
        error: $localize`Failed to edit`
      },
      add: {
        params: [formdata],
        success: $localize`Added successfully`,
        error: $localize`Failed to add`
      }
    };
    const operateName = uuid ? 'edit' : 'add';
    const operate = operateMUI[operateName];
    const [data, err] = await this.effect[operateName === 'edit' ? 'updateEnv' : 'addEnv'](formdata);
    this.isSaving = false;
    if (err) {
      if (err.code == 131000001) {
        this.message.error($localize`Environment name length needs to be less than 32`);
        return;
      }
      this.message.error(operate.error);
      return;
    }
    if (data) {
      this.message.success(operate.success);
      if (operateName === 'add') {
        this.router.navigate(['home/workspace/project/api/env/edit'], {
          queryParams: { pageID: this.route.snapshot.queryParams.pageID, uuid: data.id }
        });
      }
      this.afterSaved.emit(this.initialModel);
    }
    if (!this.store.getEnvUuid) {
      this.store.setEnvUuid(data.id || formdata.id);
    }
  }
  async init() {
    const id = Number(this.route.snapshot.queryParams.uuid);
    if (!id) {
      this.model = {
        name: '',
        hostUri: '',
        parameters: []
      };
      this.initialModel = eoDeepCopy(this.model);
    } else {
      if (!this.model) {
        const [res, err]: any = await this.getEnv(id);
        this.model = res;
        this.initialModel = eoDeepCopy(this.model);
      }
    }
    this.initForm();
    this.eoOnInit.emit(this.model);
  }
  private initForm() {
    this.validateForm = this.fb.group({
      name: [this.model?.name || '', [Validators.required]],
      hostUri: [this.model?.hostUri || '']
    });
  }
  emitChange($event) {
    this.modelChange.emit(this.model);
  }
  isFormChange() {
    const hasChanged = JSON.stringify(this.formatEnvData(this.model)) !== JSON.stringify(this.formatEnvData(this.initialModel));
    return hasChanged;
  }
  async getEnv(id: number) {
    const [result, err] = await this.api.api_environmentDetail({
      id
    });
    if (err) {
      return [null, err];
    } else {
      const envData = result ?? {};
      const parameters = envData.parameters ?? [];
      envData.parameters = JSONParse(parameters);
      return [envData];
    }
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}