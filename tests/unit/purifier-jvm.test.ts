import { describe, it, expect } from 'vitest';
import { parseJvmStacktrace } from '../../src/core/purifier/jvm.js';
import { purifyErrorOutput } from '../../src/core/purifier/index.js';

describe('JVM Stacktrace Purifier', () => {
  it('parses Java NullPointerException and filters JDK internals', () => {
    const rawJvmTrace = `
Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null
\tat com.company.app.UserService.process(UserService.java:54)
\tat java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
\tat java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
\tat com.company.app.Application.main(Application.java:20)
`;

    const result = parseJvmStacktrace(rawJvmTrace);
    expect(result).not.toBeNull();
    expect(result?.engine).toBe('jvm');
    expect(result?.name).toBe('NullPointerException');
    expect(result?.message).toBe('Cannot invoke "String.length()" because "name" is null');
    expect(result?.file).toBe('UserService.java');
    expect(result?.line).toBe(54);
    // JDK internals should be stripped
    expect(result?.purifiedFrames.some((f) => f.functionName?.includes('jdk.internal'))).toBe(false);
    expect(result?.purifiedFrames.length).toBe(2);
  });

  it('parses Kotlin / Spring Framework exceptions', () => {
    const springTrace = `
org.springframework.beans.factory.NoSuchBeanDefinitionException: No qualifying bean of type 'com.auth.TokenService' available
\tat org.springframework.beans.factory.support.DefaultListableBeanFactory.getBean(DefaultListableBeanFactory.java:343)
\tat com.example.web.AuthController.init(AuthController.kt:28)
`;

    const result = purifyErrorOutput(springTrace);
    expect(result.engine).toBe('jvm');
    expect(result.name).toBe('NoSuchBeanDefinitionException');
    expect(result.message).toContain("No qualifying bean of type 'com.auth.TokenService' available");
    expect(result.file).toBe('AuthController.kt');
    expect(result.line).toBe(28);
  });

  it('returns null for non-JVM logs', () => {
    const output = 'cargo test failed with error: unresolved import';
    const result = parseJvmStacktrace(output);
    expect(result).toBeNull();
  });
});
