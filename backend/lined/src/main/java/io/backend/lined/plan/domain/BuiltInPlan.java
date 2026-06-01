package io.backend.lined.plan.domain;

public enum BuiltInPlan {

  FREE("FREE"),
  PRO("PRO"),
  FAMILY("FAMILY");

  private final String value;

  BuiltInPlan(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }
}
