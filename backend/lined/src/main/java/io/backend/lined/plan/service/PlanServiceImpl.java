package io.backend.lined.plan.service;

import io.backend.lined.common.exception.NotFoundException;
import io.backend.lined.plan.api.PlanCreateDto;
import io.backend.lined.plan.api.PlanDto;
import io.backend.lined.plan.api.PlanMapper;
import io.backend.lined.plan.api.PlanUpdateDto;
import io.backend.lined.plan.domain.PlanEntity;
import io.backend.lined.plan.domain.PlanRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanServiceImpl implements PlanService {
  private final PlanRepository repository;
  private final PlanMapper mapper;

  @Override
  public PlanDto getById(Long id) {
    PlanEntity entity = repository.findById(id)
        .orElseThrow(() -> new NotFoundException("Plan with id " + id + " not found"));
    return mapper.toDto(entity);
  }

  @Override
  public PlanDto getByName(String name) {
    PlanEntity entity = repository.findByNameIgnoreCase(name)
        .orElseThrow(() -> new NotFoundException("Plan with name '" + name + "' not found"));
    return mapper.toDto(entity);
  }

  @Override
  public List<PlanDto> listAll() {
    return repository.findAll().stream()
        .map(mapper::toDto)
        .toList();
  }

  @Override
  @Transactional
  public PlanDto create(PlanCreateDto dto) {
    PlanEntity entity = mapper.toEntity(dto);
    PlanEntity saved = repository.save(entity);
    return mapper.toDto(saved);
  }

  @Override
  @Transactional
  public PlanDto update(Long id, PlanUpdateDto dto) {
    PlanEntity entity = repository.findById(id)
        .orElseThrow(() -> new NotFoundException("Plan with id " + id + " not found"));

    mapper.updateEntityFromDto(dto, entity);
    PlanEntity saved = repository.save(entity);
    return mapper.toDto(saved);
  }

  @Override
  @Transactional
  public void delete(Long id) {
    if (!repository.existsById(id)) {
      throw new NotFoundException("Plan with id " + id + " not found");
    }
    repository.deleteById(id);
  }
}
