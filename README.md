<br />
<p align="center">
 <img width="50%" height="50%" src="https://raw.githubusercontent.com/ngneat/transloco/master/logo.svg?sanitize=true">
</p>

> Translation can drive you crazy, here's the cure!

The internationalization (i18n) library for Angular

[![Build Status](https://img.shields.io/travis/datorama/akita.svg?style=flat-square)](https://travis-ci.org/ngneat/transloco)
[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors-)
[![commitizen](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)]()
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)]()
[![coc-badge](https://img.shields.io/badge/codeof-conduct-ff69b4.svg?style=flat-square)]()
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e5079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![spectator](https://img.shields.io/badge/tested%20with-spectator-2196F3.svg?style=flat-square)]()

## Features

🛀 Clean and DRY templates <br>
😴 Support for Lazy Load<br>
😍 Support for Multiple Languagues<br>
🧙‍♂️ Support for Multiple Fallbacks<br>
🤓 Support for Testing<br>
🦊 Hackable<br>

## Table of Contents

- [Installation](#installation)
- [Transloco Config](#config-options)
- [Translation in the Template](#translation-in-the-template)
  - [Using the Structural Directive](#using-the-structural-directive)
  - [Using the Attribute Directive](#using-the-attribute-directive)
  - [Using the Pipe](#using-the-pipe)
- [Programmatical Translation](#programmatical-translation)
- [Service API](#service-api)
- [Lazy Load Translation Files](#lazy-load-translation-files)
- [Using Multiple Languages Simultaneously](#using-multiple-languages-simultaneously)
- [Custom Loading Template](#custom-loading-template)
- [Hack the Library](#hack-the-library)
  - [Transloco Loader](#transloco-loader)
  - [Transloco Interceptor](#transloco-interceptor)
  - [Transloco Transpiler](#transloco-transpiler)
- [Prefetch the User Language](#prefetch-the-user-language)
- [Unit Testing](#unit-testing)
- [Additional Functionality](#additional-functionality)
- [Comparison to other libraries](#comparison-to-other-libraries)

## Installation

Install the library using Angular CLI:

`ng add @ngneat/transloco`

![Demo](transloco.gif)

As part of the installation process you'll be presented with questions; Once you answer them, everything you need will automatically be created for you. Let's take a closer look at the generated files:

First, Transloco creates boilerplate files for the requested translations:

```json
// assets/i18n/en.json
{
  "hello": "transloco en",
  "dynamic": "transloco {{value}}"
}
```

```json
// assets/i18n/es.json
{
  "hello": "transloco es",
  "dynamic": "transloco {{value}}"
}
```

Next, it injects the `TranslocoModule` into the `AppModule`, and sets some default options for you:

```ts
// app.module
import { TRANSLOCO_CONFIG, TranslocoModule } from '@ngneat/transloco';
import { HttpClientModule } from '@angular/common/http';
import { httpLoader } from './loaders/http.loader';
import { environment } from '../environments/environment';

@NgModule({
  imports: [TranslocoModule, HttpClientModule],
  providers: [
    httpLoader
    {
      provide: TRANSLOCO_CONFIG,
      useValue: {
        prodMode: environment.production,
        listenToLangChange: true,
        defaultLang: 'en'
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

### Config Options

Let's explain each one of the `config` options:

- `listenToLangChange`: Subrscribes to the language change event, and allows you to change the active language. This is not needed in applications that don't allow the user to change the language in runtime (i.e., from a dropdown), so by setting it to false in these cases, you can save on memory by rendering the view once, and unsubscribing from the language changes event (defaults to `false`).
- `defaultLang`: Sets the default language
- `fallbackLang`: Sets the default language/s to use as a fallback. See the [`TranslocoFallbackStrategy`](#transloco-fallback-strategy) section if you need to customize it.
  `failedRetries`: How many time should Transloco retry to load translation files, in case of a load failure (defaults to 2)
- `prodMode`: Whether the application runs in production mode (defaults to `false`).

It also injects the `httpLoader` into the `AppModule` providers:

```ts
import { HttpClient } from '@angular/common/http';
import { Translation, TRANSLOCO_LOADER, TranslocoLoader } from '@ngneat/transloco';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(langPath: string) {
    return this.http.get<Translation>(`/assets/i18n/${langPath}.json`);
  }
}

export const httpLoader = { provide: TRANSLOCO_LOADER, useClass: HttpLoader };
```

The `HttpLoader` is a class that implements the `TranslocoLoader` interface. It's responsible for instructing transloco how to load the translation files. It uses Angular HTTP client to fetch the files, based on the given path (We'll see why it called path on the lazy load section).

## Translation in the Template

Transloco provides three ways to translate your templates:

### Using the Structural Directive

This is the recommended approach. It's DRY and efficient, as it creates one subscription per template:

```html
<ng-container *transloco="let t">
  <ul>
    <li>{{ t.home }}</li>
    <li>{{ t.alert | translocoParams: { value: dynamic } }}</li>
  </ul>
</ng-container>

<ng-template transloco let-t>
  {{ t.home }}
</ng-template>
```

### Using the Attribute Directive

```html
<ul>
  <li><span transloco="home"></span></li>
  <li>
    <span transloco="alert" [translocoParams]="{ value: dynamic }"></span>
  </li>
  <li><span [transloco]="key"></span></li>
</ul>
```

### Using the Pipe

```html
<span>{{ 'home' | transloco }}</span> <span>{{ 'alert' | transloco: { value: dynamic } }}</span>
```

## Programmatical Translation

Sometimes you may need to translate a key in a component or a service. To do so, you can inject the `TranslocoService` and use its `translate` method:

```ts
export class AppComponent {
  constructor(private service: TranslocoService) {}

  ngOnInit() {
    this.service.translate('hello');
    this.service.translate('hello', { value: 'world' });
    this.service.translate(['hello', 'key']);
    this.service.translate('hello', params, 'en');
    this.service.translate<T>(translate => translate.someKey);
  }
}
```

Note that in order to safely use this method, you are responsible for ensuring that the translation files have been successfully loaded by the time it's called. If you aren't sure, you can use the `selectTranslate()` method instead:

```ts
this.service.selectTranslate('hello').subscribe(value => {});
this.service.selectTranslate('hello').subscribe(value => {}, 'es');
```

## Service API

- `getDefaultLang` - Returns the default language
- `setDefaultLang` - Sets the default language
- `getActiveLang` - Gets the current active language
- `setActiveLang` - Sets the current active language

```ts
service.setActiveLang(lang);
```

- `getTranslation(lang?: string)` - Returns the selected language translation or, if a language isn't passed, all of them:

```ts
service.getTranslation();
service.getTranslation('en');
```

- `setTranslation()` : Manually sets a translations object to be used for a given language, set `merge` to true if you want to append the translations instead of replacing them.

```ts
service.setTranslation({ ... }); // defaults to current language
service.setTranslation({ ... }, 'es');
service.setTranslation({ ... }, 'en', { merge: false } );
```

- `setTranslationKey` - Sets the translated value of a key. If a language isn't specified in the third parameter, it sets the key value for the current active language:

```ts
service.setTranslationKey('key', 'value');
service.setTranslationKey('key.nested', 'value');
service.setTranslationKey('key.nested', 'value', 'en');
```

- `langChanges$` - Listens to the language change event:

```ts
service.langChanges$.subscribe(lang => lang);
```

- `events$` - Listens to the translation loading events:

```ts
service.events$.pipe(filter(e => e.type === 'translationLoadSuccess')).subscribe(payload => payload.lang);

service.events$.pipe(filter(e => e.type === 'translationLoadFailure')).subscribe(payload => payload.lang);
```

- `load(lang)` - Load the given language, and add it to the service

```ts
service.load('en').subscribe();
```

## Lazy Load Translation Files

Let's say you have a todos page and you want to create separate translation files for this page, and load them only when the user navigates there. First, you need to create a `todos` folder (or whatever name you choose); In it, create a translation file for each language you want to support:

```
├─ i18n/
   ├─ en.json
   ├─ es.json
   ├─ todos/
      ├─ en.json
      ├─ es.json
```

You have several ways of telling Transloco to use them, via setting the `TRANSLOCO_SCOPE` provider based on Angular's DI rules.

You can set it the providers list of a **lazy module**:

```ts
const routes: Routes = [
  {
    path: '',
    component: TodosComponent
  }
];

@NgModule({
  declarations: [TodosComponent],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'todos' }],
  imports: [CommonModule, RouterModule.forChild(routes), TranslocoModule]
})
export class TodosModule {}
```

You can set it in a component's providers:

```ts
@Component({
  selector: 'my-comp',
  templateUrl: './my-comp.component.html',
  providers: [
    {
      provide: TRANSLOCO_SCOPE,
      useValue: 'todos'
    }
  ]
})
export class MyComponent {}
```

Or you can set the `scope` input in the `transloco` structural directive:

```html
<ng-container *transloco="let t; scope: 'todos';">
  <h1>{{ t.keyFromTodos }}</h1>
</ng-container>
```

Each one of these options tells Transloco to load the corresponding `scope` based on the current language. For example, if the current language is `en`, it will load the file `todos/en.json` and set the response to be the context in this module, component, or template, respectively.

You can think of it as a virtual directory, `todos/{langName}`, so when you need to use the API, you can refer to it as such, for example:

```ts
service.getTranslation(`todos/en`);
```

## Using Multiple Languages Simultaneously

There are times you may need to use a different language in a specific part of the template, or in a particular component or module. This can be achieved in a similar way to the previous example, except here set the `TRANSLOCO_LANG` provider either in **lazy module** providers list, the component providers or in the template.

Here's an example of setting it in a component's providers:

```ts
@Component({
  selector: 'my-comp',
  templateUrl: './my-comp.component.html',
  providers: [
    {
      provide: TRANSLOCO_LANG,
      useValue: 'es'
    }
  ]
})
export class MyComponent {}
```

Using Angular's DI rules, this will ensure that the language in this component's template and all of its children's templates is `es`.

Alternatively, here is how to use it directly in the template:

```html
<ng-container *transloco="let t; lang: 'en'">
  <p>Inline (en) wins: {{ t.home }}</p>
</ng-container>
```

## Custom Loading Template

Transloco provides you with a way to define a loading template, that will be used while the translation file is loading.

Similarly to the previous examples, set the `TRANSLOCO_LOADING_TEMPLATE` provider either in lazy module providers, component providers, in the template, or even in the `app.module` itself (affecting the entire app). For example:

```ts
@Component({
  selector: 'my-comp',
  templateUrl: './my-comp.component.html',
  providers: [
    {
      provide: TRANSLOCO_LOADING_TEMPLATE,
      useValue: '<p>loading...</p>'
    }
  ]
})
export class MyComponent {}
```

It can take a raw HTML value, or a custom Angular component.

Alternatively, here is how to use it directly in the template:

```html
<ng-container *transloco="let t; loadingTpl: loading">
  <h1>{{ t.title }}</h1>
</ng-container>

<ng-template #loading>
  <h1>Loading...</h1>
</ng-template>
```

## Hack the Library

Transloco provides you with an option to customize each one of its buliding blocks. Here's a list of the things you can customize:

#### Transloco Loader

The loader provides you with the ability to override the default handling of translation file loading.

```ts
export class CustomLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> | Promise<Translation> {
    if(langInLocalStorage) {
      return of(langFromStorage);
    }

    return ...
  }
}

export const custom = {
  provide: TRANSLOCO_LOADER,
  useClass: CustomLoader
}
```

#### Transloco Interceptor

The interceptor provides you with the ability to manipulate the translation object before it is saved by the service.

```ts
export class CustomInterceptor implements TranslocoInterceptor {
  preSaveTranslation(translation: Translation, lang: string): Translation {
    return translation;
  }

  preSaveTranslationKey(key: string, value: string, lang: string): string {
    return value;
  }
}

export const custom = {
  provide: TRANSLOCO_INTERCEPTOR,
  useClass: CustomInterceptor
};
```

The `preSaveTranslation` method is called before the translation is saved by the service, and the `preSaveTranslationKey` is called before a new key-value pair is saved by the `service.setTranslationKey()` method.

#### Transloco Transpiler

The transpiler is responsible for resolving the given value. For example, the default transpiler transpiles `Hello {{ key }}` and replaces the dynamic variable `key` based on the given params, or the translation object.

```ts
export class CustomTranspiler implements TranslocoTranspiler {
  transpile(value: string, params, translation: Translation): string {
    return ...;
  }
}

export const custom = {
  provide: TRANSLOCO_TRANSPILER,
  useClass: CustomTranspiler
}
```

#### Transloco Fallback Strategy

The fallback strategy is responsible for loading the fallback translation file, when the selected active language has failed to load. The default behavior is to load the language set in the `config.fallbackLang`, and set it as the new active language.

When you need more control over this functionality, you can define your own strategy:

```ts
export class CustomFallbackStrategy implements TranslocoFallbackStrategy {
  getNextLangs(failedLang: string) {
    return ['langOne', 'langTwo', 'langThree'];
  }
}

export const custom = {
  provide: TRANSLOCO_FALLBACK_STRATEGY,
  useClass: CustomFallbackStrategy
};
```

The `getNextLangs` method is called with the failed language, and should return an array containing the next languages to load, in order of preference.

## Prefetch the User Language

We recommend pre-emptively fetching the user’s data from the server, including internationalization settings, and making it available to the components, before we allow the user to interact with them.

We want to ensure the data is available, because we don’t want to incur a bad user experience, such as jumpy content or flickering CSS.

Here's how you can achieve this using the `APP_INITIALIZER` token:

```ts
import { APP_INITIALIZER } from '@angular/core';
import { UserService } from './user.service';
import { TranslocoService } from '@ngneat/transloco';

export function preloadUser(userService: UserService, transloco: TranslocoService) {
  return function() {
    return userService.getUser().then(({ lang }) => {
      transloco.setActiveLang(lang);
      return transloco.load(lang).toPromise();
    }
  };
}

export const preLoad = {
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: preloadUser,
  deps: [UserService, TranslocoService]
};
```

This will make sure the application doesn't bootstrap before Transloco loads the translation file based on the current user's language.

You can read more about it in [this article](https://netbasal.com/optimize-user-experience-while-your-angular-app-loads-7e982a67ff1a).

## Unit Testing

When running specs, we want the have the languages available immediately, in a synchronous fashion. Transloco provides you with a `TranslocoTestingModule`, where you can pass the languages you need in your specs. For example:

```ts
import { TranslocoTestingModule } from '@ngneat/transloco';
import en from '../../assets/i18n/en.json';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        TranslocoTestingModule.withLangs({
          en
        })
      ],
      declarations: [AppComponent]
    }).compileComponents();
  }));

  it('should work', function() {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('h1')).nativeElement.innerText).toBe('hello');
  });
});
```

## Additional Functionality

- You can point to specific keys in other keys from the same translation file. For example:

```json
{
  "alert": "alert {{value}} english",
  "home": "home english",
  "fromList": "from {{home}}"
}
```

So the result of `service.translate('fromList')` will be: "from home english".

- You don't have to inject the service each time you need to translate a key. Transloco has an exported `translate()` function:

```ts
import { translate } from '@ngneat/transloco';

translate('someKey');
```

## Migration from ngx-translate

Transloco provides a schematics [command](https://github.com/ngneat/transloco/blob/master/schematics/migration.md) that will help you with the migration process.

## Comparison to other libraries

 Feature                  | @ngneat/transloco                                 | @ngx-translate/core
 -------------------      | -------------------                               | --------------------------
 Multiple Languages       | ✅                                                | ❌
 Lazy load translation scopes             | ✅                                                | ❌
 Multiple Fallbacks       | ✅                                                | ❌
 Hackable                 | ✅                                                | ✅
 Testing                  | ✅                                                | ✅ External library
 Structural Directive     | ✅                                                | ❌
 Attribute Directive      | ✅                                                | ✅
 Pipe                     | ✅                                                | ✅
 Ivy support              | ✅                                                | ❌
 Additional Functionality | ✅ [See here](#additional-functionality)          | ❌
 Plugins                  | WIP                                               | ✅ [See here](https://github.com/ngx-translate/core#plugins)

## Support

For any questions or deliberations join our [Gitter channel](https://gitter.im/ngneat-transloco/lobby#)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://www.netbasal.com"><img src="https://avatars1.githubusercontent.com/u/6745730?v=4" width="100px;" alt="Netanel Basal"/><br /><sub><b>Netanel Basal</b></sub></a><br /><a href="#blog-NetanelBasal" title="Blogposts">📝</a> <a href="#business-NetanelBasal" title="Business development">💼</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=NetanelBasal" title="Code">💻</a> <a href="#content-NetanelBasal" title="Content">🖋</a> <a href="#design-NetanelBasal" title="Design">🎨</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=NetanelBasal" title="Documentation">📖</a> <a href="#example-NetanelBasal" title="Examples">💡</a> <a href="#ideas-NetanelBasal" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-NetanelBasal" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-NetanelBasal" title="Maintenance">🚧</a> <a href="#projectManagement-NetanelBasal" title="Project Management">📆</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=NetanelBasal" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/shaharkazaz"><img src="https://avatars2.githubusercontent.com/u/17194830?v=4" width="100px;" alt="Shahar Kazaz"/><br /><sub><b>Shahar Kazaz</b></sub></a><br /><a href="https://github.com/NetanelBasal/transloco/commits?author=shaharkazaz" title="Code">💻</a> <a href="#content-shaharkazaz" title="Content">🖋</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=shaharkazaz" title="Documentation">📖</a> <a href="#ideas-shaharkazaz" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-shaharkazaz" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-shaharkazaz" title="Maintenance">🚧</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=shaharkazaz" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/itayod"><img src="https://avatars2.githubusercontent.com/u/6719615?v=4" width="100px;" alt="Itay Oded"/><br /><sub><b>Itay Oded</b></sub></a><br /><a href="https://github.com/NetanelBasal/transloco/commits?author=itayod" title="Code">💻</a> <a href="#ideas-itayod" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-itayod" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-itayod" title="Maintenance">🚧</a> <a href="https://github.com/NetanelBasal/transloco/commits?author=itayod" title="Tests">⚠️</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
