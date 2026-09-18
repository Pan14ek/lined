package io.backend.lined.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientAddressResolverTest {

  private ClientAddressResolver resolver;

  @BeforeEach
  void setUp() {
    RateLimitProperties properties = new RateLimitProperties();
    properties.setTrustedProxies(java.util.List.of("127.0.0.1/32", "10.0.0.0/8"));
    resolver = new ClientAddressResolver(properties);
  }

  @Test
  void trustedProxyMayForwardCanonicalClientAddress() {
    MockHttpServletRequest request = request("127.0.0.1");
    request.addHeader("X-Forwarded-For", "203.0.113.10");

    assertThat(resolver.resolve(request)).isEqualTo("203.0.113.10");
  }

  @Test
  void untrustedPeerCannotSpoofForwardedAddress() {
    MockHttpServletRequest request = request("198.51.100.20");
    request.addHeader("X-Forwarded-For", "203.0.113.10");

    assertThat(resolver.resolve(request)).isEqualTo("198.51.100.20");
  }

  @Test
  void forwardedHostnameIsIgnoredInsteadOfResolvedThroughDns() {
    MockHttpServletRequest request = request("127.0.0.1");
    request.addHeader("X-Forwarded-For", "attacker.example");

    assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
  }

  @Test
  void trustedProxyMayForwardRealIpWhenForwardedForIsMissing() {
    MockHttpServletRequest request = request("127.0.0.1");
    request.addHeader("X-Real-IP", "2001:db8::10");

    assertThat(resolver.resolve(request)).isEqualTo("2001:db8:0:0:0:0:0:10");
  }

  @Test
  void invalidRealIpFallsBackToTrustedPeer() {
    MockHttpServletRequest request = request("127.0.0.1");
    request.addHeader("X-Real-IP", "attacker.example");

    assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
  }

  private MockHttpServletRequest request(String remoteAddress) {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRemoteAddr(remoteAddress);
    return request;
  }
}
