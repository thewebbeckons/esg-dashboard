<script setup lang="ts">
definePageMeta({ auth: 'guest' })

const { signIn, signUp } = useUserSession()
const toast = useToast()
const route = useRoute()

// Form state
const isLogin = ref(true)
const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: ''
})

// Safe redirect handling
function getSafeRedirect() {
  const redirect = route.query.redirect as string
  if (!redirect?.startsWith('/') || redirect.startsWith('//')) {
    return '/'
  }
  return redirect
}

async function handleSubmit() {
  loading.value = true

  try {
    if (isLogin.value) {
      await signIn.email({
        email: form.email,
        password: form.password
      }, {
        onSuccess: () => navigateTo(getSafeRedirect()),
        onError: (ctx) => {
          toast.add({
            title: 'Login failed',
            description: ctx.error?.message || 'Invalid email or password',
            color: 'error'
          })
        }
      })
    } else {
      await signUp.email({
        name: form.name,
        email: form.email,
        password: form.password
      }, {
        onSuccess: () => navigateTo(getSafeRedirect()),
        onError: (ctx) => {
          toast.add({
            title: 'Registration failed',
            description: ctx.error?.message || 'Could not create account',
            color: 'error'
          })
        }
      })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4">
    <UCard class="w-full max-w-md">
      <div class="text-center mb-6">
        <div class="flex justify-center mb-4">
          <div class="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
            <UIcon
              name="i-lucide-leaf"
              class="w-8 h-8 text-primary-600 dark:text-primary-400"
            />
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ isLogin ? 'Welcome back' : 'Create account' }}
        </h1>
        <p class="mt-1 text-gray-600 dark:text-gray-400">
          {{ isLogin ? 'Sign in to ESG News Digest' : 'Get started with ESG News Digest' }}
        </p>
      </div>

      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <UFormField
          v-if="!isLogin"
          label="Name"
          name="name"
        >
          <UInput
            v-model="form.name"
            placeholder="Your name"
            icon="i-lucide-user"
            size="lg"
            :required="!isLogin"
          />
        </UFormField>

        <UFormField
          label="Email"
          name="email"
        >
          <UInput
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            icon="i-lucide-mail"
            size="lg"
            required
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
        >
          <UInput
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            icon="i-lucide-lock"
            size="lg"
            required
          />
        </UFormField>

        <UButton
          type="submit"
          block
          size="lg"
          :loading="loading"
        >
          {{ isLogin ? 'Sign in' : 'Create account' }}
        </UButton>
      </form>

      <div class="mt-6 text-center">
        <button
          type="button"
          class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          @click="isLogin = !isLogin"
        >
          {{ isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in' }}
        </button>
      </div>
    </UCard>
  </div>
</template>
