import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { IManagedObject, InventoryBinaryService, InventoryService } from '@c8y/client';
import {
  AlertService,
  AppSwitcherInlineComponent,
  BytesPipe,
  C8yTranslatePipe,
  DatePipe,
  GenericFileIconPipe,
  IconDirective,
  LoadingComponent,
} from '@c8y/ngx-components';
import { gettext } from '@c8y/ngx-components/gettext';
import { TranslateService } from '@ngx-translate/core';
import { LoginService } from '../login.service';

type DownloadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'c8y-binary-download',
  templateUrl: './binary-download.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppSwitcherInlineComponent,
    BytesPipe,
    C8yTranslatePipe,
    DatePipe,
    GenericFileIconPipe,
    IconDirective,
    LoadingComponent,
  ],
})
export class BinaryDownloadComponent implements OnInit {
  readonly binaryId = input.required<string>();

  protected readonly state = signal<DownloadState>('loading');
  protected readonly isDownloading = signal(false);
  protected readonly managedObject = signal<IManagedObject | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly LOAD_ERROR = gettext(
    'The link might be mistyped or outdated, or the file might have been deleted. Check the link and try again, or contact the person who shared it with you.',
  );

  private readonly inventory = inject(InventoryService);
  private readonly inventoryBinary = inject(InventoryBinaryService);
  private readonly alert = inject(AlertService);
  private readonly translate = inject(TranslateService);
  private readonly loginService = inject(LoginService);
  private readonly document = inject(DOCUMENT);

  async ngOnInit() {
    try {
      const { data } = await this.inventory.detail(this.binaryId(), { withChildren: false });
      if (data['c8y_IsBinary'] == null) {
        this.errorMessage.set(this.translate.instant(this.LOAD_ERROR));
        this.state.set('error');
        return;
      }
      this.managedObject.set(data);
      this.state.set('ready');
    } catch (ex) {
      console.error('Failed to load binary for download:', ex);
      this.errorMessage.set(this.translate.instant(this.LOAD_ERROR));
      this.state.set('error');
    }
  }

  protected async download() {
    this.alert.clearAll();
    this.isDownloading.set(true);
    try {
      const mo = this.managedObject();
      const res = await this.inventoryBinary.download(mo.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = mo['name'] ?? String(mo.id);
      this.document.body.appendChild(link);
      link.click();
      this.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.alert.add({ text: gettext('File downloaded.'), type: 'success', timeout: 10_000 });
    } catch (ex) {
      this.alert.addServerFailure(ex);
    } finally {
      this.isDownloading.set(false);
    }
  }

  protected logout() {
    this.loginService.logout();
  }
}
