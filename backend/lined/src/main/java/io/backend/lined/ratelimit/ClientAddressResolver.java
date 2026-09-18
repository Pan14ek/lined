package io.backend.lined.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Resolves the client address only through a configured, verified proxy peer. */
@Component
@RequiredArgsConstructor
public class ClientAddressResolver {

  private final RateLimitProperties properties;

  public String resolve(HttpServletRequest request) {
    String peer = request.getRemoteAddr();
    if (!isTrusted(peer)) {
      return canonical(peer);
    }
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null) {
      String first = forwarded.split(",", 2)[0].trim();
      if (isAddress(first)) {
        return canonical(first);
      }
    }
    String realIp = request.getHeader("X-Real-IP");
    return isAddress(realIp) ? canonical(realIp) : canonical(peer);
  }

  private boolean isTrusted(String address) {
    return properties.getTrustedProxies().stream().anyMatch(cidr -> Cidr.parse(cidr).contains(address));
  }

  private boolean isAddress(String address) {
    if (address == null || address.isBlank() || !address.trim().matches("[0-9A-Fa-f:.]+")) {
      return false;
    }
    try {
      InetAddress.getByName(address.trim());
      return true;
    } catch (UnknownHostException ex) {
      return false;
    }
  }

  private String canonical(String address) {
    if (!isAddress(address)) {
      return "unknown";
    }
    try {
      return InetAddress.getByName(address.trim()).getHostAddress();
    } catch (UnknownHostException ex) {
      return "unknown";
    }
  }

  private record Cidr(byte[] network, int prefix) {

    static Cidr parse(String value) {
      String[] parts = value.trim().split("/", 2);
      try {
        InetAddress address = InetAddress.getByName(parts[0]);
        int prefix = parts.length == 2 ? Integer.parseInt(parts[1]) : address.getAddress().length * 8;
        if (prefix < 0 || prefix > address.getAddress().length * 8) {
          throw new IllegalArgumentException("Proxy CIDR prefix is invalid");
        }
        return new Cidr(address.getAddress(), prefix);
      } catch (UnknownHostException | NumberFormatException ex) {
        throw new IllegalArgumentException("Proxy CIDR is invalid", ex);
      }
    }

    boolean contains(String value) {
      try {
        byte[] address = InetAddress.getByName(value).getAddress();
        if (address.length != network.length) {
          return false;
        }
        int fullBytes = prefix / 8;
        int remainingBits = prefix % 8;
        if (!Arrays.equals(Arrays.copyOf(address, fullBytes), Arrays.copyOf(network, fullBytes))) {
          return false;
        }
        if (remainingBits == 0) {
          return true;
        }
        int mask = 0xFF << (8 - remainingBits);
        return (address[fullBytes] & mask) == (network[fullBytes] & mask);
      } catch (UnknownHostException ex) {
        return false;
      }
    }
  }
}
