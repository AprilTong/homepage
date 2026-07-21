<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

interface MarkdownNode {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: MarkdownNode[]
}

const allowedMarkdownTags = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])

const allowedMarkdownProperties: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  code: new Set(['className']),
  ol: new Set(['start']),
  td: new Set(['align']),
  th: new Set(['align']),
}

const allowedLinkProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const safeLinkBase = 'https://chat.invalid'

function isSafeLink(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  try {
    const url = new URL(value, safeLinkBase)
    return url.origin === safeLinkBase || allowedLinkProtocols.has(url.protocol)
  }
  catch {
    return false
  }
}

function sanitizeMarkdownChildren(children: MarkdownNode[] = []): MarkdownNode[] {
  return children.flatMap((node) => {
    if (node.type === 'text') {
      return [node]
    }

    const safeChildren = sanitizeMarkdownChildren(node.children)
    const tag = node.type === 'element' ? node.tagName?.toLowerCase() : undefined

    if (!tag || !allowedMarkdownTags.has(tag)) {
      return safeChildren
    }

    const properties = node.properties ?? {}
    if (tag === 'a' && !isSafeLink(properties.href)) {
      return safeChildren
    }

    const allowedProperties = allowedMarkdownProperties[tag]
    node.tagName = tag
    node.children = safeChildren
    node.properties = allowedProperties
      ? Object.fromEntries(
          Object.entries(properties).filter(([name]) => allowedProperties.has(name)),
        )
      : {}

    return [node]
  })
}

function safeMarkdownPlugin() {
  return (tree: MarkdownNode) => {
    tree.children = sanitizeMarkdownChildren(tree.children)
  }
}

const safeMarkdownParserOptions = {
  remark: {
    plugins: {
      'remark-mdc': false as const,
    },
  },
  rehype: {
    options: {
      allowDangerousHtml: false,
    },
    plugins: {
      'rehype-raw': false as const,
      'chat-message-sanitizer': {
        instance: safeMarkdownPlugin,
      },
    },
  },
}

const props = defineProps<{
  message: ChatMessage
}>()

const copied = ref(false)
const copyError = ref('')
const copyPending = ref(false)
const copyFeedback = computed(() => copied.value ? '已复制' : copyError.value)
let copyOperation = 0

watch(
  () => [props.message.content, props.message.status] as const,
  () => {
    copyOperation += 1
    copyPending.value = false
    copied.value = false
    copyError.value = ''
  },
)

async function copyMessage() {
  if (copyPending.value) {
    return
  }

  const operation = ++copyOperation
  const content = props.message.content

  copyPending.value = true
  copied.value = false
  copyError.value = ''

  const clipboard = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard

  if (!clipboard || typeof clipboard.writeText !== 'function') {
    copyPending.value = false
    copyError.value = '复制失败，请手动复制'
    return
  }

  try {
    await clipboard.writeText(content)

    if (operation !== copyOperation) {
      return
    }

    copyPending.value = false
    copied.value = true
  }
  catch {
    if (operation !== copyOperation) {
      return
    }

    copyPending.value = false
    copyError.value = '复制失败，请手动复制'
  }
}
</script>

<template>
  <article
    :data-role="message.role"
    :class="['chat-message', `chat-message--${message.role}`]"
  >
    <span class="chat-message__label">
      {{ message.role === 'user' ? 'YOU' : 'APRIL AI' }}
    </span>

    <p
      v-if="message.role === 'user' && message.content"
      class="chat-message__content chat-message__content--plain"
    >
      {{ message.content }}
    </p>
    <p
      v-else-if="message.status === 'streaming' && message.content"
      class="chat-message__content chat-message__content--streaming"
    >
      {{ message.content }}
    </p>
    <MDC
      v-else-if="message.content"
      class="chat-message__content"
      :value="message.content"
      :cache-key="`safe-chat-message-${message.id}`"
      :parser-options="safeMarkdownParserOptions"
    />
    <p
      v-else-if="message.role === 'assistant' && message.status === 'streaming'"
      class="chat-message__thinking"
    >
      正在思考…
    </p>

    <div
      v-if="message.role === 'assistant' && message.content && message.status !== 'streaming'"
      class="chat-message__actions"
    >
      <button
        type="button"
        aria-label="复制回答"
        :disabled="copyPending"
        @click="copyMessage"
      >
        {{ copyPending ? '复制中…' : copied ? '已复制' : '复制' }}
      </button>
      <span
        v-if="copyFeedback"
        class="chat-message__copy-status"
        role="status"
        aria-live="polite"
      >
        {{ copyFeedback }}
      </span>
    </div>

    <span
      v-if="message.status === 'stopped'"
      class="chat-message__state chat-message__state--stopped"
    >
      已停止生成
    </span>
    <span
      v-else-if="message.status === 'error'"
      class="chat-message__state chat-message__state--error"
    >
      回答生成失败
    </span>

    <details
      v-if="message.citations?.length"
      class="chat-message__citations citations"
    >
      <summary>查看 {{ message.citations.length }} 条引用来源</summary>
      <article
        v-for="citation in message.citations"
        :key="citation.id"
        class="citation"
      >
        <strong class="citation__title">{{ citation.title }}</strong>
        <p class="citation__excerpt">
          {{ citation.excerpt }}
        </p>
      </article>
    </details>
  </article>
</template>
