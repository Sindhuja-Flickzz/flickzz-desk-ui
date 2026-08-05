import { Injectable, OnDestroy } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { NotificationPopupComponent } from '../shared/notification-popup/notification-popup.component';
import { NotificationPayload } from '../models/notification.model';
import { Subscription } from 'rxjs';
import { NotificationService } from './notification.service';

interface ActiveEntry {
  overlayRef: OverlayRef;
  timerId: number | null;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationOverlayService implements OnDestroy {
  private active: ActiveEntry[] = [];
  private readonly maxStack = 3;
  private readonly popupHeight = 98;
  private readonly spacing = 10;
  private subs: Subscription[] = [];

  constructor(
    private overlay: Overlay,
    private notificationService: NotificationService
  ) {
    this.subs.push(
      this.notificationService.queuedNotifications$.subscribe((notification) => {
        if (notification) {
          this.show(notification);
        }
      })
    );
  }

  show(notification: NotificationPayload): void {
    const origin = typeof document !== 'undefined' ? document.querySelector('.notification-button') as HTMLElement | null : null;
    let topBase = 20;
    let rightBase = 18;

    if (origin) {
      const rect = origin.getBoundingClientRect();
      topBase = Math.max(16, Math.round(rect.bottom + 10));
      rightBase = Math.max(16, Math.round(window.innerWidth - rect.right));
    }

    if (this.active.length >= this.maxStack) {
      this.disposeEntry(this.active[0]);
    }

    const index = this.active.length;
    const topPx = topBase + index * (this.popupHeight + this.spacing);

    const overlayRef = this.overlay.create({
      hasBackdrop: false,
      panelClass: 'notification-overlay-pane',
      positionStrategy: this.overlay.position().global().top(`${topPx}px`).right(`${rightBase}px`),
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });

    overlayRef.overlayElement.style.zIndex = String(10000 + index);
    overlayRef.overlayElement.style.transition = 'top 180ms ease, opacity 180ms ease, transform 180ms ease';
    overlayRef.overlayElement.style.opacity = '0';
    overlayRef.overlayElement.style.transform = 'translateY(-10px)';

    const portal = new ComponentPortal(NotificationPopupComponent);
    const compRef = overlayRef.attach(portal);
    compRef.instance.notification = notification;
    compRef.instance.closed.subscribe(() => this.disposeEntryByRef(overlayRef));
    compRef.changeDetectorRef.detectChanges();

    const entry: ActiveEntry = { overlayRef, timerId: null, createdAt: Date.now() };
    this.active.push(entry);

    requestAnimationFrame(() => {
      overlayRef.overlayElement.style.opacity = '1';
      overlayRef.overlayElement.style.transform = 'translateY(0)';
    });

    entry.timerId = window.setTimeout(() => this.disposeEntry(entry), 6000);
  }

  private disposeEntryByRef(ref: OverlayRef): void {
    const entry = this.active.find((item) => item.overlayRef === ref);
    if (entry) {
      this.disposeEntry(entry);
    }
  }

  private disposeEntry(entry: ActiveEntry): void {
    if (entry.timerId) {
      window.clearTimeout(entry.timerId);
      entry.timerId = null;
    }

    try {
      entry.overlayRef.dispose();
    } catch {}

    const index = this.active.indexOf(entry);
    if (index >= 0) {
      this.active.splice(index, 1);
      this.repositionAll();
    }
  }

  private repositionAll(): void {
    const origin = typeof document !== 'undefined' ? document.querySelector('.notification-button') as HTMLElement | null : null;
    let topBase = 20;
    let rightBase = 18;

    if (origin) {
      const rect = origin.getBoundingClientRect();
      topBase = Math.max(16, Math.round(rect.bottom + 10));
      rightBase = Math.max(16, Math.round(window.innerWidth - rect.right));
    }

    this.active.forEach((entry, index) => {
      const topPx = topBase + index * (this.popupHeight + this.spacing);
      try {
        entry.overlayRef.updatePositionStrategy(this.overlay.position().global().top(`${topPx}px`).right(`${rightBase}px`));
        entry.overlayRef.overlayElement.style.top = `${topPx}px`;
        entry.overlayRef.overlayElement.style.right = `${rightBase}px`;
      } catch {}
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
    this.active.forEach((entry) => {
      if (entry.timerId) {
        window.clearTimeout(entry.timerId);
      }
      try {
        entry.overlayRef.dispose();
      } catch {}
    });
    this.active = [];
  }
}
