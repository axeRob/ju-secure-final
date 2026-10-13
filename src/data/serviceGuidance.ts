/** Navigation hints only: no sign-in pages, service calls, or credential inputs. */
export interface ServiceGuidance {
  steps: readonly string[];
  signInNote: string;
}

const settingHints: Record<string, string> = {
  google: 'Look in your Google Account for Security and the Password setting. Use Google’s own help if the labels differ.',
  instagram: 'Look in Settings or Accounts Center for Password and security, then Change password. Use Instagram’s own help if the labels differ.',
  facebook: 'Look in Settings or Accounts Center for Password and security, then Change password. Use Facebook’s own help if the labels differ.',
  github: 'Look in your account Settings for Password and authentication. Use GitHub’s own help if the labels differ.',
};

/** Unknown and imported fictional services receive manual instructions, never a guessed URL. */
export function getServiceGuidance(serviceName: string): ServiceGuidance {
  const name = serviceName.trim() || 'the service';
  const settingHint = settingHints[name.toLowerCase()] ??
    `In your account settings, look for Password, Security, or Sign-in options. Follow ${name}’s own help if you cannot find the setting.`;
  return {
    steps: [
      `Open ${name} separately using its app, a saved bookmark, or the website you already know. You can keep JU Secure open while you follow along.`,
      settingHint,
      'If you are changing a real account, create a different, real password with a trusted password manager and follow the service’s instructions. Never use this prototype’s DEMO value.',
    ],
    signInNote: 'If you sign in through Google, Apple, a university, or another provider, manage your password with that provider. Some accounts use a passkey and have no separate password.',
  };
}
