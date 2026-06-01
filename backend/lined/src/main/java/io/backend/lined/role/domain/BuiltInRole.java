package io.backend.lined.role.domain;

public enum BuiltInRole {

  USER("ROLE_USER"),
  ADMIN("ROLE_ADMIN");

  private final String value;

  BuiltInRole(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }
}
