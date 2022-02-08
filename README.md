<img src="https://user-images.githubusercontent.com/659408/152967955-aa53ca73-db35-4ebd-80a1-5f69f145b6f9.png" alt="UPify">

UPify is a personal practice project aimed at fully exploring the ins and outs of Svelte development and building API-driven web apps. It uses the [UP API](https://developer.up.com.au) to power a desktop-class web interface for browsing and analysing transactions on your UP account.

All communication with UP is handled securely by the browser, UPify has no backend or servers. This means all user data is stored entirely in the browser's local storage and is never sent anywhere other than the browser or UP itself. In addition, all user credentials are stored encrypted within the browser and require the user's custom password to decrypt.

It's built in a manner that could be hosted online and used by anyone; mostly because for me, part of the fun of these practice projects is building full user-friendly UIs and apps. But it's unlikely to ever be used that way:

- UPify authenticates users via an API key which is a little overcomplicated for the average user.
- For the same reasons, I think it's a big ask for the average user to understand and trust in the security of a front-end only app. If I came across something like this in the wild there's no way I'd put my credentials into it.
- Using it in a public manner is also unlikely to fit within UP's [acceptable use policy](https://up.com.au/api-acceptable-use-policy/).

For these reasons, UPify will most likely remain a private demo project. However if you review the code, understand it and the risks and want to run it for yourself? Knock yourself out, cowboy.

## Tech stack

UPify is built using [Svelte](https://svelte.dev) and [SvelteKit](https://kit.svelte.dev). It uses some premade Svelte components and open-source Javascript utilites, all of which are detailed in `package.json`

## Developing

Once you've cloned this repository and installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

UPify comes preconfigured with a SvelteKit adapter for Netlify. However if you wanted to host it where else you can grab [a different adapter](https://kit.svelte.dev/docs#adapters) suited to your target environment.

Then when you're ready to build a prod-ready version of your app, run:

```bash
npm run build
```
