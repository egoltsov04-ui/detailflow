import {t} from '../i18n/core'
import {isStaging} from '../lib/appVersion'
/** A fixed label on the staging site so it is never mistaken for production. Hidden on production. */
export default function StagingBadge(){
 if(!isStaging())return null
 return <div className="staging-badge" role="note">{t('STAGING — тестова версія')}</div>
}
