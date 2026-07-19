package io.backend.lined.common;

import io.backend.lined.common.exception.BadRequestException;
import io.backend.lined.common.exception.ConflictException;
import io.backend.lined.common.exception.PreconditionRequiredException;

/** Parses and verifies strong ETag preconditions for mutable resources. */
public final class VersionPrecondition {

  private VersionPrecondition() {
  }

  public static long parse(String ifMatch) {
    if (ifMatch == null || ifMatch.isBlank()) {
      throw new PreconditionRequiredException("If-Match header is required");
    }
    if (!ifMatch.matches("\\\"[0-9]+\\\"")) {
      throw new BadRequestException("If-Match must be a quoted numeric ETag");
    }
    try {
      return Long.parseLong(ifMatch.substring(1, ifMatch.length() - 1));
    } catch (NumberFormatException ex) {
      throw new BadRequestException("If-Match version is out of range");
    }
  }

  public static void verify(long actualVersion, long expectedVersion) {
    if (actualVersion != expectedVersion) {
      throw new ConflictException("Resource has been modified; fetch the latest version and retry");
    }
  }

  public static String etag(long version) {
    return "\"%d\"".formatted(version);
  }
}
