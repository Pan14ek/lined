package io.backend.lined.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI customOpenAPI() {
    return new OpenAPI()
        .info(new Info()
            .title("lined-backend API")
            .version("0.1.0")
            .description("API documentation for lined-backend")
            .contact(new Contact().name("Dev Team").email("dev@example.com"))
        )
        .servers(List.of(new Server().url("http://localhost:8080")));
  }

  @Bean
  public GroupedOpenApi usersApi() {
    return GroupedOpenApi.builder()
        .group("users")
        .pathsToMatch("/api/users/**")
        .build();
  }

  @Bean
  public GroupedOpenApi rolesApi() {
    return GroupedOpenApi.builder()
        .group("roles")
        .pathsToMatch("/api/roles/**")
        .build();
  }

  @Bean
  public GroupedOpenApi lobbiesApi() {
    return GroupedOpenApi.builder()
        .group("lobbies")
        .pathsToMatch("/api/lobbies/**")
        .build();
  }

  @Bean
  public GroupedOpenApi tasksApi() {
    return GroupedOpenApi.builder()
        .group("tasks")
        .pathsToMatch("/api/tasks/**")
        .build();
  }

  @Bean
  public GroupedOpenApi eventsApi() {
    return GroupedOpenApi.builder()
        .group("events")
        .pathsToMatch("/api/events/**")
        .build();
  }

}
