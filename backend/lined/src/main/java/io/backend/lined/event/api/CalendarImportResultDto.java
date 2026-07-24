package io.backend.lined.event.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Summarizes one best-effort import of an iCalendar document.
 *
 * <p>For example, importing 16 VEVENTs may return {@code imported=14}, {@code skipped=2}, and
 * errors describing two recurring events that v1 intentionally does not expand. {@code imported}
 * includes both newly created events and UID-matched updates.</p>
 *
 * @param imported number of private events created or updated
 * @param skipped number of VEVENTs not imported
 * @param errors safe, per-event explanations for skipped VEVENTs
 */
@Schema(name = "CalendarImportResultDto")
public record CalendarImportResultDto(
    @Schema(example = "14") int imported,
    @Schema(example = "2") int skipped,
    List<String> errors
) {
}
