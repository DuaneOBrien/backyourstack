import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import NextLink from 'next/link';
import { get } from 'lodash';

import { Link, Router } from '../routes';

import { fetchJson, postJson } from '../lib/fetch';

import Header from '../components/Header';
import Footer from '../components/Footer';

import DependencyTable from '../components/DependencyTable';
import RepositoryTable from '../components/RepositoryTable';
import RecommendationList from '../components/RecommendationList';
import SubscribeForm from '../components/SubscribeForm';
import BackMyStack from '../components/BackMyStack';

import TwitterLogo from '../static/img/twitter.svg';
import FacebookLogo from '../static/img/facebook.svg';

const ocWebsiteUrl = process.env.WEBSITE_URL || 'https://opencollective.com';

const getProfileData = (id, accessToken) =>
  process.env.IS_CLIENT
    ? fetchJson(`/data/getProfileData?id=${id}`)
    : import('../lib/data').then(m => m.getProfileData(id, accessToken));

export default class Profile extends React.Component {
  static async getInitialProps({ req, query }) {
    const initialProps = {
      section: query.section,
      id: query.id,
      showBackMyStack: query.showBackMyStack,
    };

    try {
      // The accessToken is only required server side (it's ok if it's undefined on client side)
      const accessToken = get(req, 'session.passport.user.accessToken');
      const data = await getProfileData(query.id, accessToken);

      return { ...initialProps, ...data };
    } catch (error) {
      return { ...initialProps, error };
    }
  }

  static propTypes = {
    section: PropTypes.PropTypes.oneOf(['dependencies', 'repositories']),
    pathname: PropTypes.string,
    loggedInUser: PropTypes.object,
    profile: PropTypes.object,
    opencollectiveAccount: PropTypes.object,
    repos: PropTypes.array,
    dependencies: PropTypes.array,
    recommendations: PropTypes.array,
    error: PropTypes.object,
    showBackMyStack: PropTypes.bool,
    id: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.showBackMyStack =
      props.showBackMyStack === 'true' ||
      process.env.SHOW_BACK_MY_STACK === 'true';
  }

  twitterText = () => 'BackYourStack! https://backyourstack.com/';

  profileLink = () => `https://backyourstack.com/${this.props.profile.login}`;

  githubLink = () => `https://github.com/${this.props.profile.login}`;

  opencollectiveLink = () =>
    this.props.opencollectiveAccount &&
    `${ocWebsiteUrl}/${this.props.opencollectiveAccount.slug}`;

  profileName = () => {
    const githubProfileName =
      this.props.profile.name || this.props.profile.login;
    const opencollectiveProfileName =
      this.props.opencollectiveAccount && this.props.opencollectiveAccount.name;
    if (opencollectiveProfileName) {
      if (opencollectiveProfileName.length < githubProfileName.length) {
        return opencollectiveProfileName;
      }
    }
    return githubProfileName;
  };

  saveProfileToS3() {
    const { id } = this.props;

    return postJson('/profile/save', { id });
  }

  handleBackMyStack = async () => {
    try {
      const savedProfileUrl = await this.saveProfileToS3();
      const profileId = savedProfileUrl.Key.split('/')[0];
      await Router.pushRoute('monthly-plan', {
        id: profileId,
        type: 'profile',
      });
    } catch (err) {
      console.error(err);
    }
  };

  render() {
    const {
      section,
      error,
      profile,
      opencollectiveAccount,
      repos,
      dependencies,
      recommendations,
      pathname,
      loggedInUser,
    } = this.props;

    return (
      <div className="Page ProfilePage">
        <style jsx global>
          {`
            .ProfilePage {
              position: relative;
            }
            @media screen and (min-width: 500px) {
              .ProfilePage footer {
                display: none !important;
              }
            }
          `}
        </style>

        <style jsx>
          {`
            .shortStats {
              color: #121314;
              font-size: 16px;
              line-height: 24px;
            }

            .profileLink a {
              color: #7448ff;
              text-decoration: none;
              display: block;
            }
            .profileLink a:hover {
              color: #7448ff;
              text-decoration: underline;
            }

            .profileLink a.backyourstack {
              margin-bottom: 10px;
            }

            .profileLink,
            .socialLinks {
              margin-top: 25px;
            }

            .button:last-child {
              margin-right: 0;
            }

            .subscribe,
            .bulk {
              margin-top: 50px;
            }

            .bulk .button {
              display: inline-block;
              margin-top: 20px;
            }
          `}
        </style>

        <Header loggedInUser={loggedInUser} pathname={pathname} />

        {error && (
          <div>
            <p>{error.message}</p>
            <Link route="login" params={{ next: pathname }}>
              <a>Please Sign In with GitHub to avoid rate limit errors.</a>
            </Link>
          </div>
        )}

        {!error && (
          <Fragment>
            <div className="navigation">
              <h1>{this.profileName()}</h1>
              <div className="navigation-items">
                <Link route="profile" params={{ id: profile.login }}>
                  <a className={classNames({ active: !section })}>
                    Projects requiring funding
                  </a>
                </Link>
                <Link
                  route="profile"
                  params={{ id: profile.login, section: 'dependencies' }}
                >
                  <a
                    className={classNames({
                      active: section === 'dependencies',
                    })}
                  >
                    Detected Dependencies
                  </a>
                </Link>
                <Link
                  route="profile"
                  params={{ id: profile.login, section: 'repositories' }}
                >
                  <a
                    className={classNames({
                      active: section === 'repositories',
                    })}
                  >
                    Analyzed Repositories
                  </a>
                </Link>
              </div>
            </div>

            <aside>
              <div className="shortStats">
                <strong>{repos.length}</strong> repositories depending on{' '}
                <strong>{dependencies.length}</strong>
                &nbsp;Open Source projects.
              </div>

              <div className="profileLink">
                <a href={this.profileLink()} className="backyourstack">
                  &gt; {this.profileLink().replace('https://', '')}
                </a>
                <a href={this.githubLink()} className="github">
                  &gt; {this.githubLink().replace('https://', '')}
                </a>
                {opencollectiveAccount && (
                  <a
                    href={this.opencollectiveLink()}
                    className="opencollective"
                  >
                    &gt; {this.opencollectiveLink().replace('https://', '')}
                  </a>
                )}
              </div>

              <div className="socialLinks">
                <NextLink
                  href={{
                    pathname: 'https://twitter.com/intent/tweet',
                    query: { text: this.twitterText() },
                  }}
                >
                  <a className="button shareButton" title="Share on Twitter">
                    <TwitterLogo className="logo" />
                    &nbsp; Tweet
                  </a>
                </NextLink>
                <NextLink
                  href={{
                    pathname: 'https://www.facebook.com/sharer/sharer.php',
                    query: { u: this.profileLink() },
                  }}
                >
                  <a className="button shareButton" title="Share on Facebook">
                    <FacebookLogo className="logo" />
                    &nbsp; Share
                  </a>
                </NextLink>
              </div>

              <div className="subscribe">
                <h3>Stay up to date!</h3>
                <p>
                  Receive a notification when one of your dependencies is ready
                  to receive funding and a monthly report on your stack’s
                  progress, goals and updates.
                </p>
                <SubscribeForm profile={profile.login} />
              </div>

              <div className="bulk">
                <h3>Bulk Support</h3>
                <p>
                  Instead of supporting each project individually, you can also
                  support all your dependencies in bulk and give a lump sum of
                  money. The Open Source Collective 501c6 can work with you to
                  get registered as a prefered vendor in your system.
                </p>
                <a className="button" href="mailto:hello@opencollective.com">
                  Contact Us
                </a>
              </div>
            </aside>

            <main>
              {this.showBackMyStack && (
                <BackMyStack onClickBackMyStack={this.handleBackMyStack} />
              )}
              {(!section || section === 'recommendations') && (
                <RecommendationList
                  recommendations={recommendations}
                  opencollectiveAccount={opencollectiveAccount}
                />
              )}

              {section === 'dependencies' && (
                <DependencyTable dependencies={dependencies} />
              )}

              {section === 'repositories' && (
                <RepositoryTable repositories={repos} />
              )}
            </main>
          </Fragment>
        )}

        <Footer />
      </div>
    );
  }
}
