import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CONFIG } from './config.js';
import { extractByHashtag } from './extractor/hashtag.js';
import { extractByKeyword } from './extractor/keyword.js';
import { mapRawToTikTokPost } from './mapper/postMapper.js';
import { classifyTier } from './ranker/classifier.js';
import { rankPosts } from './ranker/ranker.js';
import { filterBrazilianPosts } from './filter/brazil.js';
import { writeJson } from './formatter/json.js';
import { writeCsv } from './formatter/csv.js';
import { SortField } from './types/tiktok.js';

const program = new Command();

program
  .name('tiktok-extractor')
  .description('Extrator de trends do TikTok via Apify')
  .version('1.0.0');

program
  .command('search')
  .option('--keyword <keyword>', 'Busca por keyword')
  .option('--hashtag <hashtags...>', 'Busca por hashtags')
  .option('--max <n>', 'Máximo de resultados', String(CONFIG.DEFAULT_MAX_RESULTS))
  .option('--sort <field>', 'Campo para ordenação', CONFIG.DEFAULT_SORT_BY)
  .option('--min-views <n>', 'Filtro mínimo de views', '0')
  .option('--format <format>', 'json | csv | both', 'json')
  .option('--output <file>', 'Arquivo de saída base', 'output/results')
  .option('--only-brazil', 'Scrape via proxy BR + filtro de posts brasileiros', false)
  .option('--proxy-country <code>', 'País do proxy (ISO alpha-2, ex.: BR)')
  .action(async (opts) => {
    if (!CONFIG.APIFY_API_TOKEN) {
      console.error(chalk.red('Erro: APIFY_API_TOKEN não definido no ambiente.'));
      process.exit(1);
    }

    const spinner = ora('Buscando posts no TikTok via Apify...').start();

    try {
      const max = Number(opts.max);
      const minViews = Number(opts['minViews']);
      const sortBy = opts.sort as SortField;
      const format = opts.format as 'json' | 'csv' | 'both';
      const output = opts.output as string;
      const onlyBrazil = Boolean(opts.onlyBrazil);
      const proxyCountryCode = opts.proxyCountry || (onlyBrazil ? 'BR' : undefined);
      const extractorOptions = { proxyCountryCode, scrapeAdditionalAuthorMeta: onlyBrazil };
      // Sobre-amostra quando o filtro BR vai descartar itens (mesma lógica do server)
      const fetchMax = onlyBrazil ? Math.min(Math.max(max * 3, 30), 150) : max;

      // Em modo BR usamos BUSCA (localizada por proxy) em vez do feed de
      // hashtag (global). Ver comentários em src/server.ts e src/filter/brazil.ts.
      const brViaSearch = onlyBrazil && Boolean(opts.hashtag?.length) && !opts.keyword;
      const localized = onlyBrazil && (Boolean(opts.keyword) || brViaSearch);

      let rawItems: any[] = [];
      if (opts.keyword) {
        rawItems = await extractByKeyword([opts.keyword], fetchMax, true, extractorOptions);
      } else if (opts.hashtag && opts.hashtag.length) {
        const terms = (opts.hashtag as string[]).map((h) => h.replace(/^#/, ''));
        rawItems = brViaSearch
          ? await extractByKeyword(terms, fetchMax, true, extractorOptions)
          : await extractByHashtag(terms, fetchMax, true, extractorOptions);
      } else {
        spinner.fail('Você deve informar --keyword ou --hashtag');
        process.exit(1);
      }

      let posts = rawItems.map(mapRawToTikTokPost);
      if (onlyBrazil) {
        const { kept, removed } = filterBrazilianPosts(posts, { proxyLocalized: localized });
        posts = kept;
        if (removed > 0) spinner.info(`🇧🇷 ${removed} posts não-BR descartados`);
      }
      posts = posts
        .filter((p) => p.metrics.playCount >= minViews)
        .map((p) => ({ ...p, trendTier: classifyTier(p.metrics.playCount, p.engagementRate) }));

      posts = rankPosts(posts, sortBy);

      spinner.succeed(`${posts.length} posts processados.`);

      const top = posts.slice(0, 10);
      console.log(chalk.cyan('\n📊 TOP POSTS\n'));
      for (const p of top) {
        const badge = p.trendTier === 'VIRAL' ? '🔥' : p.trendTier === 'HOT' ? '🌶️' : p.trendTier === 'RISING' ? '📈' : '•';
        console.log(
          `${badge} ${p.trendTier.padEnd(7)} @${p.author.username.padEnd(16)} ${String(p.metrics.playCount).padStart(10)} views  ❤️ ${String(p.metrics.diggCount).padStart(8)}  💬 ${String(p.metrics.commentCount).padStart(7)}`,
        );
      }

      if (format === 'json' || format === 'both') {
        await writeJson(posts, `${output}.json`);
      }
      if (format === 'csv' || format === 'both') {
        await writeCsv(posts, `${output}.csv`);
      }

      console.log(chalk.green(`\n💾 Output salvo em ${output}.${format === 'both' ? '{json,csv}' : format}`));
    } catch (error: any) {
      spinner.fail('Falha na extração/processamento');
      console.error(chalk.red(error?.message || error));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
