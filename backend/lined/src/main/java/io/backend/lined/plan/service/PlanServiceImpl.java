package io.backend.lined.plan.service;

import io.backend.lined.plan.api.PlanDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PlanServiceImpl implements PlanService {
  @Override
  public PlanDto getById(Long id) {
    return null;
  }

  @Override
  public PlanDto getByName(String name) {
    return null;
  }

  @Override
  public List<PlanDto> listAll() {
    return List.of();
  }
}
