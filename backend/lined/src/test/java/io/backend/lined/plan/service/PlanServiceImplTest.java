package io.backend.lined.plan.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.plan.api.PlanCreateDto;
import io.backend.lined.plan.api.PlanDto;
import io.backend.lined.plan.api.PlanMapper;
import io.backend.lined.plan.api.PlanUpdateDto;
import io.backend.lined.plan.domain.PlanEntity;
import io.backend.lined.plan.domain.PlanRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PlanServiceImplTest {

  @Mock
  private PlanRepository repository;
  @Mock
  private PlanMapper mapper;

  @InjectMocks
  private PlanServiceImpl planService;

  private PlanEntity planEntity;
  private PlanDto planDto;

  @BeforeEach
  void setUp() {
    planEntity = PlanEntity.builder()
        .id(1L)
        .name("PRO_MONTHLY")
        .priceUsd(new BigDecimal("9.99"))
        .durationDays(30)
        .createdAt(OffsetDateTime.now())
        .build();

    planDto = new PlanDto(1L, "PRO_MONTHLY", new BigDecimal("9.99"), 30, planEntity.getCreatedAt());
  }

  /* =======================
     GET BY ID
  ======================= */

  @Test
  void getById_success() {
    when(repository.findById(1L)).thenReturn(Optional.of(planEntity));
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    PlanDto result = planService.getById(1L);

    assertThat(result).isEqualTo(planDto);
  }

  @Test
  void getById_throwsNotFound_whenPlanDoesNotExist() {
    when(repository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> planService.getById(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");
  }

  /* =======================
     GET BY NAME
  ======================= */

  @Test
  void getByName_success() {
    when(repository.findByNameIgnoreCase("PRO_MONTHLY")).thenReturn(Optional.of(planEntity));
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    PlanDto result = planService.getByName("PRO_MONTHLY");

    assertThat(result).isEqualTo(planDto);
  }

  @Test
  void getByName_isCaseInsensitive() {
    when(repository.findByNameIgnoreCase("pro_monthly")).thenReturn(Optional.of(planEntity));
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    PlanDto result = planService.getByName("pro_monthly");

    assertThat(result).isNotNull();
  }

  @Test
  void getByName_throwsNotFound_whenPlanDoesNotExist() {
    when(repository.findByNameIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> planService.getByName("UNKNOWN"))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("UNKNOWN");
  }

  /* =======================
     LIST ALL
  ======================= */

  @Test
  void listAll_returnsAllPlans() {
    PlanEntity second = PlanEntity.builder()
        .id(2L)
        .name("BASIC_MONTHLY")
        .priceUsd(new BigDecimal("4.99"))
        .durationDays(30)
        .createdAt(OffsetDateTime.now())
        .build();
    PlanDto secondDto =
        new PlanDto(2L, "BASIC_MONTHLY", new BigDecimal("4.99"), 30, second.getCreatedAt());

    when(repository.findAll()).thenReturn(List.of(planEntity, second));
    when(mapper.toDto(planEntity)).thenReturn(planDto);
    when(mapper.toDto(second)).thenReturn(secondDto);

    List<PlanDto> result = planService.listAll();

    assertThat(result).hasSize(2).containsExactlyInAnyOrder(planDto, secondDto);
  }

  @Test
  void listAll_returnsEmptyList_whenNoPlans() {
    when(repository.findAll()).thenReturn(List.of());

    List<PlanDto> result = planService.listAll();

    assertThat(result).isEmpty();
  }

  /* =======================
     CREATE
  ======================= */

  @Test
  void create_success() {
    PlanCreateDto dto = new PlanCreateDto("PRO_MONTHLY", new BigDecimal("9.99"), 30);

    when(mapper.toEntity(dto)).thenReturn(planEntity);
    when(repository.save(planEntity)).thenReturn(planEntity);
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    PlanDto result = planService.create(dto);

    assertThat(result).isEqualTo(planDto);
    verify(repository).save(planEntity);
  }

  @Test
  void create_savesEntityFromMapper() {
    PlanCreateDto dto = new PlanCreateDto("NEW_PLAN", new BigDecimal("5.00"), 15);

    when(mapper.toEntity(dto)).thenReturn(planEntity);
    when(repository.save(planEntity)).thenReturn(planEntity);
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    planService.create(dto);

    verify(mapper).toEntity(dto);
    verify(repository).save(planEntity);
  }

  /* =======================
     UPDATE
  ======================= */

  @Test
  void update_success() {
    PlanUpdateDto dto = new PlanUpdateDto("PRO_MONTHLY", new BigDecimal("12.99"), 30);

    when(repository.findById(1L)).thenReturn(Optional.of(planEntity));
    when(repository.save(planEntity)).thenReturn(planEntity);
    when(mapper.toDto(planEntity)).thenReturn(planDto);

    PlanDto result = planService.update(1L, dto);

    assertThat(result).isNotNull();
    verify(mapper).updateEntityFromDto(dto, planEntity);
    verify(repository).save(planEntity);
  }

  @Test
  void update_throwsNotFound_whenPlanDoesNotExist() {
    PlanUpdateDto dto = new PlanUpdateDto("PRO_MONTHLY", new BigDecimal("12.99"), 30);

    when(repository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> planService.update(99L, dto))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(repository, never()).save(any());
  }

  /* =======================
     DELETE
  ======================= */

  @Test
  void delete_success() {
    when(repository.existsById(1L)).thenReturn(true);

    planService.delete(1L);

    verify(repository).deleteById(1L);
  }

  @Test
  void delete_throwsNotFound_whenPlanDoesNotExist() {
    when(repository.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> planService.delete(99L))
        .isInstanceOf(NotFoundException.class)
        .hasMessageContaining("99");

    verify(repository, never()).deleteById(any());
  }
}