import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { SupportGroupComponent } from './support-group.component';

describe('SupportGroupComponent', () => {
  let component: SupportGroupComponent;

  beforeEach(() => {
    const supportGroupService = {
      getAllSupportGroups: jasmine.createSpy('getAllSupportGroups').and.returnValue(of([])),
      createSupportGroup: jasmine.createSpy('createSupportGroup').and.returnValue(of({})),
      updateSupportGroup: jasmine.createSpy('updateSupportGroup').and.returnValue(of({})),
      deleteSupportGroup: jasmine.createSpy('deleteSupportGroup').and.returnValue(of({}))
    };

    const agentService = {
      getAgentList: jasmine.createSpy('getAgentList').and.returnValue(of({ attributes: [] }))
    };

    component = new SupportGroupComponent(
      new FormBuilder(),
      supportGroupService as any,
      agentService as any,
      {} as any,
      { queryParamMap: of({ get: () => null }) } as any,
      { back: jasmine.createSpy('back') } as any
    );
  });

  it('should populate internal and BP managers when editing a support group', () => {
    component.startEdit({
      supportGroupId: 10,
      groupName: 'Ops Group',
      managers: [
        { agentId: 1, agentName: 'Alice', isInternal: true },
        { agentId: 2, agentName: 'Bob', isBP: true }
      ],
      members: [{ agentId: 3, agentName: 'Charlie' }]
    });

    expect(component.managerInternalAgents.map((agent) => agent.agentName)).toEqual(['Alice']);
    expect(component.managerBpAgents.map((agent) => agent.agentName)).toEqual(['Bob']);
  });
});
