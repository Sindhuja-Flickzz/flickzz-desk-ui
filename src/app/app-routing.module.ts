import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LoginComponent} from "./pages/login/login.component";
import {RegisterComponent} from "./pages/register/register.component";
import {WelcomeComponent} from "./pages/welcome/welcome.component";
import {CreateCalendarComponent} from "./pages/calendar/create-calendar/create-calendar.component";
import {CalendarListPageComponent} from "./pages/calendar/calendar-list/calendar-list.component";
import {PlantComponent} from "./pages/plant/plant.component";
import {SkillComponent} from "./pages/skill/skill.component";
import {authGuard} from "./service/auth/auth.guard";

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'welcome',
    component: WelcomeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'calendar/create-calendar',
    component: CreateCalendarComponent,
    canActivate: [authGuard]
  },
  {
    path: 'calendar/list',
    component: CalendarListPageComponent,
    canActivate: [authGuard]
  },
  {
    path: 'plant',
    component: PlantComponent,
    canActivate: [authGuard]
  },
  {
    path: 'skill',
    component: SkillComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
