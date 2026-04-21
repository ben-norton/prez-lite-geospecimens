<script setup lang="ts">
import logoSrc from '~/assets/logo-darkgray-horizontal.svg'

const { navLinks } = useNavigation()
</script>

<template>
  <UHeader class="border-b border-default">
    <template #left>
      <NuxtLink to="/" class="flex items-center">
        <img
          :src="logoSrc"
          alt="GeoSpecimens"
          id="logo"
          class="h-9 w-auto dark:invert"
        />
      </NuxtLink>
    </template>

    <slot name="navigation">
      <UNavigationMenu :items="navLinks" :ui="{ content: 'z-[60]' }" />
    </slot>

    <template #right>
      <slot name="actions">
        <UButton
          to="/search"
          icon="i-heroicons-magnifying-glass"
          color="neutral"
          variant="ghost"
          aria-label="Search vocabularies"
        />
        <GitHubAuthButton />
        <UColorModeButton variant="ghost" />
      </slot>
    </template>

    <template #body>
      <slot name="mobile-navigation">
        <UNavigationMenu :items="navLinks" orientation="vertical" class="-mx-2.5" />
      </slot>
    </template>
  </UHeader>
</template>
