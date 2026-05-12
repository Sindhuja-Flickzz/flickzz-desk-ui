import { Injectable, Renderer2, RendererFactory2, ElementRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  public isDarkMode$: Observable<boolean> = this.isDarkModeSubject.asObservable();

  private readonly THEME_KEY = 'theme';
  private readonly DARK_THEME_CLASS = 'dark-theme';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }

  private initializeTheme(): void {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const isDarkMode = savedTheme === 'dark';

    this.isDarkModeSubject.next(isDarkMode);
    this.applyTheme(isDarkMode);
  }

  public toggleTheme(): void {
    const currentTheme = this.isDarkModeSubject.value;
    const newTheme = !currentTheme;

    this.isDarkModeSubject.next(newTheme);
    this.applyTheme(newTheme);
    this.saveThemePreference(newTheme);
  }

  public setTheme(isDarkMode: boolean): void {
    this.isDarkModeSubject.next(isDarkMode);
    this.applyTheme(isDarkMode);
    this.saveThemePreference(isDarkMode);
  }

  private applyTheme(isDarkMode: boolean): void {
    const appShell = document.querySelector('.app-shell') || document.body;
    const pageContent = document.querySelector('.page-content') || document.body;

    if (isDarkMode) {
      this.renderer.addClass(appShell, this.DARK_THEME_CLASS);
      this.renderer.addClass(pageContent, this.DARK_THEME_CLASS);
    //   this.renderer.addClass(this.el.nativeElement, this.DARK_THEME_CLASS);
    } else {
      this.renderer.removeClass(appShell, this.DARK_THEME_CLASS);
      this.renderer.removeClass(pageContent, this.DARK_THEME_CLASS);
        // this.renderer.removeClass(this.el.nativeElement, this.DARK_THEME_CLASS);
    }
  }

  private saveThemePreference(isDarkMode: boolean): void {
    const theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem(this.THEME_KEY, theme);
  }

  public getCurrentTheme(): boolean {
    return this.isDarkModeSubject.value;
  }
}