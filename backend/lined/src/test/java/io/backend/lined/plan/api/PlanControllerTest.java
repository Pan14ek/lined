package io.backend.lined.plan.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.plan.service.PlanService;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanControllerTest {

  @Mock
  private PlanService planService;

  private PlanController controller;
  private PlanDto samplePlan;

  @BeforeEach
  void setUp() {
    controller = new PlanController(planService);
    samplePlan = new PlanDto(1L, "FREE", OffsetDateTime.now());
  }

  @Test
  void listAll_delegatesToService() {
    when(planService.listAll()).thenReturn(List.of(samplePlan));

    List<PlanDto> result = controller.listAll();

    assertThat(result).containsExactly(samplePlan);
    verify(planService).listAll();
  }

  @Test
  void listAll_returnsEmptyList_whenNoPlans() {
    when(planService.listAll()).thenReturn(List.of());

    List<PlanDto> result = controller.listAll();

    assertThat(result).isEmpty();
  }

  @Test
  void getById_delegatesToService() {
    when(planService.getById(1L)).thenReturn(samplePlan);

    PlanDto result = controller.getById(1L);

    assertThat(result).isEqualTo(samplePlan);
    verify(planService).getById(1L);
  }

  @Test
  void getById_propagatesNotFoundException_whenPlanNotFound() {
    when(planService.getById(99L)).thenThrow(new NotFoundException("Plan 99 not found"));

    assertThatThrownBy(() -> controller.getById(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void getByName_delegatesToService() {
    when(planService.getByName("PRO_MONTHLY")).thenReturn(samplePlan);

    PlanDto result = controller.getByName("PRO_MONTHLY");

    assertThat(result).isEqualTo(samplePlan);
    verify(planService).getByName("PRO_MONTHLY");
  }

  @Test
  void getByName_propagatesNotFoundException_whenPlanNotFound() {
    when(planService.getByName("GHOST")).thenThrow(new NotFoundException("Plan GHOST not found"));

    assertThatThrownBy(() -> controller.getByName("GHOST"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("GHOST");
  }

}
