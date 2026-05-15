<script>
	import { goto } from '$app/navigation';
	import { login } from '$lib/stores/auth';
	import Button from '$lib/components/ui/Button.svelte';

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state('');

	/** @param {SubmitEvent} e */
	async function handleLogin(e) {
		e.preventDefault();
		isLoading = true;
		error = '';

		if (!email || !password) {
			error = 'Por favor ingresa tus credenciales';
			isLoading = false;
			return;
		}

		try {
			await login(email, password);
			await goto('/');
		} catch (err) {
			console.error(err);
			error = 'Error al iniciar sesión. Verifique sus credenciales.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="login-stage">
	<!-- Layers de fondo -->
	<div class="bg-layer" aria-hidden="true">
		<div class="bg-cosmic"></div>
		<div class="bg-aurora"></div>
		<div class="stars-wrapper">
			<div class="stars-1"></div>
			<div class="stars-2"></div>
		</div>
	</div>

	<!-- Contenido -->
	<div class="login-card-wrapper">
		<header class="login-header">
			<div class="logo-frame">
				<div class="logo-glow" aria-hidden="true"></div>
				<div class="logo-inner">
					<img
						src="/images/logo.png"
						alt="Geminislabs"
						class="h-20 w-20 object-contain"
						style="filter: drop-shadow(0 0 12px var(--color-shadow-primary))"
					/>
				</div>
			</div>

			<h1 class="login-title gac-text-gradient">Geminislabs Admin</h1>
			<p class="text-sm text-app-secondary">Acceso al panel de control</p>
		</header>

		<div class="gac-panel login-form-card">
			<!-- Línea brillante decorativa -->
			<div class="shine" aria-hidden="true"></div>

			<form onsubmit={handleLogin} class="space-y-5">
				<div class="space-y-1.5">
					<label for="email" class="login-label">Correo electrónico</label>
					<input
						id="email"
						type="email"
						placeholder="usuario@geminislabs.com"
						bind:value={email}
						required
						autocomplete="email"
						class="gac-input login-input"
					/>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="login-label">Contraseña</label>
					<input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						required
						autocomplete="current-password"
						class="gac-input login-input"
					/>
				</div>

				{#if error}
					<div class="login-error" role="alert">
						{error}
					</div>
				{/if}

				<Button type="submit" variant="primary" fullWidth disabled={isLoading} class="login-submit">
					{#if isLoading}
						<svg
							class="mr-2 h-5 w-5 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Accediendo…
					{:else}
						Iniciar sesión
					{/if}
				</Button>
			</form>
		</div>

		<p class="login-footer text-xs text-app-muted">
			© {new Date().getFullYear()} Geminislabs · Panel administrativo
		</p>
	</div>
</div>

<style>
	.login-stage {
		position: relative;
		width: 100%;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		isolation: isolate;
	}

	.login-card-wrapper {
		position: relative;
		z-index: var(--z-content);
		width: 100%;
		max-width: 26rem;
		padding: 0 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.login-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
	}

	.logo-frame {
		position: relative;
		padding: 0.5rem;
	}

	.logo-glow {
		position: absolute;
		inset: -2px;
		border-radius: var(--radius-xl);
		background: var(--gradient-brand);
		filter: blur(18px);
		opacity: 0.35;
	}

	.logo-inner {
		position: relative;
		padding: 1.25rem;
		border-radius: var(--radius-xl);
		background: var(--color-glass-bg);
		border: 1px solid var(--color-glass-border);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.login-title {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		margin-top: 1rem;
	}

	.login-form-card {
		position: relative;
		width: 100%;
		padding: 2rem;
		overflow: hidden;
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		box-shadow: var(--shadow-xl);
	}

	.shine {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--color-accent-primary), transparent);
		opacity: 0.45;
	}

	.login-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		padding-left: 0.25rem;
	}

	.login-input {
		height: 2.85rem;
		font-size: 0.95rem;
		border-radius: var(--radius-md);
	}

	.login-error {
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm);
		background-color: var(--color-danger-bg);
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
		color: var(--color-danger);
		font-size: 0.875rem;
	}

	:global(.login-submit) {
		height: 3rem !important;
		font-size: 0.95rem !important;
		letter-spacing: 0.02em;
	}

	.login-footer {
		margin-top: 0.5rem;
	}

	/* === FONDO COSMICO === */
	.bg-layer {
		position: fixed;
		inset: 0;
		z-index: var(--z-background);
		overflow: hidden;
		pointer-events: none;
	}

	.bg-cosmic {
		position: absolute;
		top: -10%;
		left: -10%;
		width: 120%;
		height: 120%;
		background: var(--gradient-hero);
		animation: cosmic-drift 60s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
	}

	.bg-aurora {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 50%, var(--color-shadow-primary), transparent 70%);
		mix-blend-mode: screen;
		animation: aurora-pulse 8s infinite alternate ease-in-out;
	}

	.stars-wrapper {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 60%;
		mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
		pointer-events: none;
	}

	.stars-1,
	.stars-2 {
		position: absolute;
		inset: 0;
		background-repeat: repeat;
	}

	.stars-1 {
		background-image:
			radial-gradient(1px 1px at 20px 30px, var(--color-text-primary), transparent),
			radial-gradient(1px 1px at 40px 70px, var(--color-text-primary), transparent),
			radial-gradient(1px 1px at 50px 160px, var(--color-text-primary), transparent),
			radial-gradient(1px 1px at 90px 40px, var(--color-text-primary), transparent),
			radial-gradient(1px 1px at 130px 80px, var(--color-text-primary), transparent),
			radial-gradient(1px 1px at 160px 120px, var(--color-text-primary), transparent);
		background-size: 200px 200px;
		opacity: 0.4;
		animation:
			stars-move 100s linear infinite,
			stars-twinkle 3s ease-in-out infinite alternate;
	}

	.stars-2 {
		background-image:
			radial-gradient(2px 2px at 100px 50px, var(--color-text-primary), transparent),
			radial-gradient(2px 2px at 200px 150px, var(--color-text-primary), transparent),
			radial-gradient(2px 2px at 300px 100px, var(--color-text-primary), transparent);
		background-size: 400px 400px;
		opacity: 0.5;
		animation:
			stars-move 150s linear infinite,
			stars-twinkle 5s ease-in-out infinite alternate-reverse;
	}

	@keyframes cosmic-drift {
		0% {
			transform: scale(1) rotate(0deg);
		}
		100% {
			transform: scale(1.1) rotate(0.5deg);
		}
	}

	@keyframes aurora-pulse {
		0% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 0.55;
			transform: scale(1.08);
		}
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
	}

	@keyframes stars-move {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(-100px);
		}
	}

	@keyframes stars-twinkle {
		0% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.3;
		}
	}

	/* Para temas claros, el cielo estrellado pierde sentido — atenuamos */
	:global(html[data-theme='classic']) .stars-wrapper {
		display: none;
	}
	:global(html[data-theme='classic']) .bg-aurora {
		opacity: 0.4;
	}
</style>
