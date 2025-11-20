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

  PlanDto update(Long id, PlanUpdateDto dto);

  void delete(Long id);
}
