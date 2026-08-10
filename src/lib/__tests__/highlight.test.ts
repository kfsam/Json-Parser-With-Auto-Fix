import { describe, expect, it } from 'vitest';
import { escapeHtml, syntaxHighlight } from '../highlight';

describe('highlight module', () => {
  it('escapeHtml escapes &, <, >', () => {
    expect(escapeHtml('a & <b> c')).toBe('a &amp; &lt;b&gt; c');
  });
  it('wraps keys, strings, numbers, booleans, null', () => {
    const html = syntaxHighlight('{\n  "a": 1,\n  "b": "x",\n  "c": true,\n  "d": null\n}');
    expect(html).toContain('<span class="json-key">"a":</span>');
    expect(html).toContain('<span class="json-number">1</span>');
    expect(html).toContain('<span class="json-string">"x"</span>');
    expect(html).toContain('<span class="json-boolean">true</span>');
    expect(html).toContain('<span class="json-null">null</span>');
  });
  it('escapes HTML inside JSON before wrapping', () => {
    expect(syntaxHighlight('{"a":"<script>"}')).toContain('&lt;script&gt;');
  });
});
