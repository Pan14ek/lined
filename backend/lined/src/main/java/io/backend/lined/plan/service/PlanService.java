package io.backend.lined.plan.service;

import io.backend.lined.plan.api.PlanCreateDto;
import io.backend.lined.plan.api.PlanDto;
import io.backend.lined.plan.api.PlanUpdateDto;
import java.util.List;

public interface PlanService {

  PlanDto getById(Long id);

  PlanDto getByName(String name);

  List<PlanDto> listAll();

  PlanDto create(PlanCreateDto dto);

  PlanDto update(Long id, PlanUpdateDto dto, long expectedVersion);

  @Deprecated
  default PlanDto update(Long id, PlanUpdateDto dto) {
    return update(id, dto, -1L);
  }

  void delete(Long id, long expectedVersion);

  @Deprecated
  default void delete(Long id) {
    delete(id, -1L);
  }
}
