package io.backend.lined.plan.service;

import io.backend.lined.plan.api.PlanDto;
import java.util.List;

public interface PlanService {

  PlanDto getById(Long id);

  PlanDto getByName(String name);

  List<PlanDto> listAll();

}
