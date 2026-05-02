import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LoginComponent} from "./pages/login/login.component";
import {RegisterComponent} from "./pages/register/register.component";
import {WelcomeComponent} from "./pages/welcome/welcome.component";
import {CreateCalendarComponent} from "./pages/calendar/create-calendar/create-calendar.component";
import {CalendarListPageComponent} from "./pages/calendar/calendar-list/calendar-list.component";
import {PlantComponent} from "./pages/plant/plant.component";
import {SkillComponent} from "./pages/skill/skill.component";
import {CompanyComponent} from "./pages/company/company.component";
import {AgentComponent} from "./pages/agent/agent.component";
import {PriorityComponent} from "./pages/priority/priority.component";
import {ImpactComponent} from "./pages/impact/impact.component";
import {RitmComponent} from "./pages/ritm/ritm.component";
import {BusinessOfferingComponent} from "./pages/business-offering/business-offering.component";
import {NumberRangeComponent} from "./pages/number-range/number-range.component";
import {VerifyComponent} from './pages/verify/verify.component';
import {EnquiryRegistrationComponent} from './pages/enquiry-registration/enquiry-registration.component';
import {SettingsComponent} from './pages/settings/settings.component';
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
    path: 'settings',
    component: SettingsComponent,
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
    path: 'number-range',
    component: NumberRangeComponent,
    canActivate: [authGuard]
  },
  {
    path: 'business-offering',
    component: BusinessOfferingComponent,
    canActivate: [authGuard]
  },
  {
    path: 'priority',
    component: PriorityComponent,
    canActivate: [authGuard]
  },
  {
    path: 'impact',
    component: ImpactComponent,
    canActivate: [authGuard]
  },
  {
    path: 'ritm',
    component: RitmComponent,
    canActivate: [authGuard]
  },
  {
    path: 'skill',
    component: SkillComponent,
    canActivate: [authGuard]
  },
  {
    path: 'company',
    component: CompanyComponent,
    canActivate: [authGuard]
  },
  {
    path: 'company/requestor',
    component: CompanyComponent,
    canActivate: [authGuard],
    data: { type: 'requestor' }
  },
  {
    path: 'company/service-provider',
    component: CompanyComponent,
    canActivate: [authGuard],
    data: { type: 'service-provider' }
  },
  {
    path: 'agent',
    component: AgentComponent,
    canActivate: [authGuard]
  },
  {
    path: 'enquiry/register',
    component: EnquiryRegistrationComponent
  },
  {
    path: 'enquiry/verify',
    component: VerifyComponent
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
