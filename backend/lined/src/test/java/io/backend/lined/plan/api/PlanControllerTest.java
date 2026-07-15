package io.backend.lined.plan.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.plan.service.PlanService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class PlanControllerTest {

  @Mock
  private PlanService planService;

  private PlanController controller;
  private PlanDto samplePlan;

  @BeforeEach
  void setUp() {
    controller = new PlanController(planService);
    samplePlan = new PlanDto(1L, "PRO_MONTHLY", BigDecimal.valueOf(9.99), 30, OffsetDateTime.now());
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

  @Test
  void create_delegatesToService_andReturns201WithLocationHeader() {
    var createDto = new PlanCreateDto("PRO_MONTHLY", BigDecimal.valueOf(9.99), 30);
    when(planService.create(createDto)).thenReturn(samplePlan);

    var response = controller.create(createDto);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    assertThat(response.getBody()).isEqualTo(samplePlan);
    assertThat(response.getHeaders().getLocation()).isNotNull();
    assertThat(response.getHeaders().getLocation().toString()).contains("/api/plans/1");
    verify(planService).create(createDto);
  }

  @Test
  void update_delegatesToService() {
    var updateDto = new PlanUpdateDto("PRO_MONTHLY", BigDecimal.valueOf(12.99), 30);
    when(planService.update(1L, updateDto)).thenReturn(samplePlan);

    PlanDto result = controller.update(1L, updateDto);

    assertThat(result).isEqualTo(samplePlan);
    verify(planService).update(1L, updateDto);
  }

  @Test
  void update_propagatesNotFoundException_whenPlanNotFound() {
    var updateDto = new PlanUpdateDto("PRO_MONTHLY", BigDecimal.valueOf(12.99), 30);
    when(planService.update(99L, updateDto))
        .thenThrow(new NotFoundException("Plan 99 not found"));

    assertThatThrownBy(() -> controller.update(99L, updateDto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  @Test
  void delete_delegatesToService_andReturns204() {
    var response = controller.delete(1L);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    verify(planService).delete(1L);
  }

  @Test
  void delete_propagatesNotFoundException_whenPlanNotFound() {
    org.mockito.Mockito.doThrow(new NotFoundException("Plan 99 not found"))
        .when(planService).delete(99L);

    assertThatThrownBy(() -> controller.delete(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }
}
